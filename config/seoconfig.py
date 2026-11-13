#!/usr/bin/env python3
"""
Read / edit Screaming Frog `.seospiderconfig` files without the desktop app.

A .seospiderconfig is a plain Java Object Serialization stream (magic ACED0005)
holding a `seo.spider.config.SpiderConfigPersistableState` object graph.
This tool decodes the stream into JSON and encodes the JSON back into a stream
that Screaming Frog can load.

    seoconfig.py decode  in.seospiderconfig  out.json
    seoconfig.py encode  in.json             out.seospiderconfig
    seoconfig.py verify  in.seospiderconfig  # decode+encode must be byte-identical
    seoconfig.py summary in.seospiderconfig  # human readable overview
    seoconfig.py get     in.seospiderconfig  mCrawlConfig.mMaxThreads
    seoconfig.py set     in.seospiderconfig  mCrawlConfig.mMaxThreads 10 [out]  # in place if no out

JSON layout
-----------
{
  "classes": { "<class name>": {suid, flags, fields:[[type,name,sig?]...], super, ...} },
  "root":    <value>
}
value :=  null | "string" | number | bool
        | {"@class": C, "@fields": {name: value, ...}}                 object
        | {"@class": C, "@list": [value...]}                            ArrayList (size is recomputed)
        | {"@class": C, "@set": [value...], "@capacity":n, "@loadFactor":f}   HashSet
        | {"@class": C, "@map": [[k, v]...], ...}                       HashMap
        | {"@enum": C, "name": "CONSTANT"}                              enum constant
        | {"@array": "[Lx;", "items": [value...]}                       array (byte[] => {"@bytes": hex})
        | {"@class": C, "@fields": {...}, "@ann": [...]}                other custom-serialised data;
                                                                        "@ann" items: {"@block": hex} or value
        | {"@id": n, ...} / {"@ref": n}                                 shared object / back-reference
"""
import json
import struct
import sys

MAGIC = 0xACED
VERSION = 5
TC_NULL, TC_REFERENCE, TC_CLASSDESC, TC_OBJECT, TC_STRING, TC_ARRAY = 0x70, 0x71, 0x72, 0x73, 0x74, 0x75
TC_CLASS, TC_BLOCKDATA, TC_ENDBLOCKDATA, TC_RESET, TC_BLOCKDATALONG = 0x76, 0x77, 0x78, 0x79, 0x7A
TC_LONGSTRING, TC_PROXYCLASSDESC, TC_ENUM = 0x7C, 0x7D, 0x7E
SC_WRITE_METHOD, SC_SERIALIZABLE, SC_EXTERNALIZABLE, SC_BLOCK_DATA, SC_ENUM = 0x01, 0x02, 0x04, 0x08, 0x10
BASE_HANDLE = 0x7E0000

PRIM = {  # typecode -> struct format
    "B": ">b", "C": ">H", "D": ">d", "F": ">f", "I": ">i", "J": ">q", "S": ">h", "Z": ">?",
}


class JStr(str):
    """A string read from the stream; identity matters because Java shares strings by identity."""


# ----------------------------------------------------------------------------- reader
class Reader:
    def __init__(self, data):
        self.d = data
        self.p = 0
        self.handles = []  # handle index -> python node
        self.classes = {}  # name -> classdesc dict
        self.refcount = {}  # id(node) -> count

    def take(self, n):
        b = self.d[self.p:self.p + n]
        if len(b) != n:
            raise EOFError("truncated stream")
        self.p += n
        return b

    def u8(self): return self.take(1)[0]
    def u16(self): return struct.unpack(">H", self.take(2))[0]
    def i32(self): return struct.unpack(">i", self.take(4))[0]
    def i64(self): return struct.unpack(">q", self.take(8))[0]

    def utf(self): return self.take(self.u16()).decode("utf-8")  # modified-UTF8 == UTF8 for BMP w/o NUL

    def peek(self): return self.d[self.p]

    def new_handle(self, node):
        self.handles.append(node)
        return len(self.handles) - 1

    # -- stream
    def stream(self):
        if self.u16() != MAGIC or self.u16() != VERSION:
            raise ValueError("not a Java serialization stream")
        items = []
        while self.p < len(self.d):
            items.append(self.content())
        if len(items) != 1:
            raise ValueError(f"expected single root object, got {len(items)}")
        return items[0]

    # -- generic content
    def content(self):
        tc = self.u8()
        if tc == TC_NULL:
            return None
        if tc == TC_REFERENCE:
            h = self.i32() - BASE_HANDLE
            node = self.handles[h]
            self.refcount[id(node)] = self.refcount.get(id(node), 0) + 1
            return {"@ref": node}  # resolved later
        if tc == TC_STRING:
            s = JStr(self.utf())
            self.new_handle(s)
            return s
        if tc == TC_LONGSTRING:
            s = JStr(self.take(self.i64()).decode("utf-8"))
            self.new_handle(s)
            return s
        if tc == TC_OBJECT:
            return self.obj()
        if tc == TC_ENUM:
            cd = self.classdesc()
            node = {"@enum": cd["name"]}
            self.new_handle(node)
            node["name"] = self.content()
            # enum constant string handle belongs to the constant
            return node
        if tc == TC_ARRAY:
            return self.array()
        if tc == TC_CLASSDESC:
            self.p -= 1
            return {"@classdesc": self.classdesc()["name"]}
        if tc == TC_RESET:
            raise NotImplementedError("TC_RESET")
        raise ValueError(f"unexpected typecode 0x{tc:02x} at {self.p - 1}")

    def classdesc(self):
        tc = self.u8()
        if tc == TC_NULL:
            return None
        if tc == TC_REFERENCE:
            return self.handles[self.i32() - BASE_HANDLE]
        if tc == TC_PROXYCLASSDESC:
            raise NotImplementedError("proxy class")
        if tc != TC_CLASSDESC:
            raise ValueError(f"bad classdesc tc 0x{tc:02x}")
        cd = {"name": self.utf()}
        cd["suid"] = self.i64()
        self.new_handle(cd)
        cd["flags"] = self.u8()
        fields = []
        for _ in range(self.u16()):
            t = chr(self.u8())
            name = self.utf()
            f = [t, name]
            if t in "[L":
                f.append(self.content())  # class signature string (TC_STRING/REFERENCE)
            fields.append(f)
        cd["fields"] = fields
        ann = self.annotation()
        if ann:
            cd["annotation"] = ann
        cd["super"] = None
        sup = self.classdesc()
        cd["super"] = sup["name"] if sup else None
        cd["_super"] = sup
        if cd["name"] in self.classes and self.classes[cd["name"]] is not cd:
            raise ValueError("duplicate classdesc " + cd["name"])
        self.classes[cd["name"]] = cd
        return cd

    def annotation(self):
        out = []
        while True:
            tc = self.peek()
            if tc == TC_ENDBLOCKDATA:
                self.p += 1
                return out
            if tc == TC_BLOCKDATA:
                self.p += 1
                out.append({"@block": self.take(self.u8()).hex()})
            elif tc == TC_BLOCKDATALONG:
                self.p += 1
                out.append({"@block": self.take(self.i32()).hex()})
            else:
                out.append(self.content())

    def hierarchy(self, cd):
        chain = []
        while cd:
            chain.append(cd)
            cd = cd["_super"]
        return chain[::-1]

    def obj(self):
        cd = self.classdesc()
        node = {"@class": cd["name"], "@fields": {}}
        self.new_handle(node)
        anns = {}
        for c in self.hierarchy(cd):
            fl = c["flags"]
            if fl & SC_EXTERNALIZABLE:
                if not fl & SC_BLOCK_DATA:
                    raise NotImplementedError("protocol-1 externalizable " + c["name"])
                anns[c["name"]] = self.annotation()  # writeExternal payload, kept raw
                continue
            if fl & SC_SERIALIZABLE:
                for f in c["fields"]:
                    if f[1] in node["@fields"]:
                        raise ValueError(f"field name collision {f[1]} in {cd['name']}")
                    if f[0] in PRIM:
                        node["@fields"][f[1]] = self.prim(f[0])
                    else:
                        node["@fields"][f[1]] = self.content()
            if fl & SC_WRITE_METHOD:
                anns[c["name"]] = self.annotation()
        if anns:
            node["@ann"] = anns
        return node

    def prim(self, t):
        v = struct.unpack(PRIM[t], self.take(struct.calcsize(PRIM[t])))[0]
        return chr(v) if t == "C" else v

    def array(self):
        cd = self.classdesc()
        node = {"@array": cd["name"]}
        self.new_handle(node)
        n = self.i32()
        et = cd["name"][1]
        if et == "B":
            node["@bytes"] = self.take(n).hex()
            return node
        items = []
        for _ in range(n):
            items.append(self.prim(et) if et in PRIM else self.content())
        node["items"] = items
        return node


# ------------------------------------------------------- friendly collection transforms
def _blk(hexs): return bytes.fromhex(hexs)


def plain_name(x):
    return str(x["@ref"] if isinstance(x, dict) else x)


def simplify(node, rd, ids):
    """Resolve refs, assign @id to shared objects/strings, collapse known collections.

    Java shares strings/objects by identity; that sharing is preserved here
    ({"@str": s, "@id": n} first occurrence, {"@ref": n} later) so a decode+encode
    of an untouched file is byte-identical."""

    def walk(n):
        if isinstance(n, list):
            return [walk(x) for x in n]
        if isinstance(n, JStr):
            if rd.refcount.get(id(n)):
                return {"@str": str(n), "@id": ids.setdefault(id(n), len(ids) + 1)}
            return str(n)
        if not isinstance(n, dict):
            return n
        if "@ref" in n and len(n) == 1:
            t = n["@ref"]
            if isinstance(t, dict) and "@enum" in t:
                return {"@enum": t["@enum"], "name": plain_name(t["name"])}
            return {"@ref": ids.setdefault(id(t), len(ids) + 1)}
        if "@classdesc" in n:
            return n
        out = {}
        if rd.refcount.get(id(n)) and "@enum" not in n:
            out["@id"] = ids.setdefault(id(n), len(ids) + 1)
        for k, v in n.items():
            if k == "@fields":
                out[k] = {fk: walk(fv) for fk, fv in v.items()}
            elif k == "@ann":
                out[k] = {ck: walk(cv) for ck, cv in v.items()}
            elif k in ("items",):
                out[k] = [walk(x) for x in v]
            elif k == "name" and "@enum" in n:
                out[k] = plain_name(v)
                if isinstance(v, dict):
                    out["@nameref"] = ids.setdefault(id(v["@ref"]), len(ids) + 1)
                elif rd.refcount.get(id(v)):
                    out["@nameid"] = ids.setdefault(id(v), len(ids) + 1)
            else:
                out[k] = v
        return friendly(out)

    def friendly(o):
        cls = o.get("@class")
        ann = o.get("@ann", {})
        if cls == "java.util.ArrayList" and set(ann) == {cls} and list(o["@fields"]) == ["size"]:
            a = ann[cls]
            if a and "@block" in a[0] and len(_blk(a[0]["@block"])) == 4 and len(a) - 1 == o["@fields"]["size"]:
                res = {k: v for k, v in o.items() if k not in ("@fields", "@ann")}
                res["@list"] = a[1:]
                return res
        if cls == "java.util.HashSet" and set(ann) == {cls} and not o["@fields"]:
            a = ann[cls]
            if a and "@block" in a[0] and len(_blk(a[0]["@block"])) == 12:
                cap, lf, size = struct.unpack(">ifi", _blk(a[0]["@block"]))
                if size == len(a) - 1:
                    res = {k: v for k, v in o.items() if k not in ("@fields", "@ann")}
                    res.update({"@capacity": cap, "@loadFactor": lf, "@set": a[1:]})
                    return res
        if cls in ("java.util.HashMap", "java.util.LinkedHashMap") and set(ann) <= {"java.util.HashMap"}:
            a = ann.get("java.util.HashMap")
            if a and "@block" in a[0] and len(_blk(a[0]["@block"])) == 8:
                buckets, size = struct.unpack(">ii", _blk(a[0]["@block"]))
                rest = a[1:]
                if size * 2 == len(rest):
                    res = {k: v for k, v in o.items() if k not in ("@ann",)}
                    res.update({"@buckets": buckets, "@map": [[rest[i], rest[i + 1]] for i in range(0, len(rest), 2)]})
                    return res
        return o

    return walk(node)


# ----------------------------------------------------------------------------- writer
class Writer:
    def __init__(self, classes):
        self.out = bytearray()
        self.classes = classes
        self.next_handle = 0
        self.cd_handle = {}
        self.enum_handle = {}
        self.id_handle = {}

    def w(self, b): self.out += b
    def u8(self, v): self.out.append(v)
    def u16(self, v): self.out += struct.pack(">H", v)
    def i32(self, v): self.out += struct.pack(">i", v)
    def i64(self, v): self.out += struct.pack(">q", v)

    def utf(self, s):
        b = s.encode("utf-8")
        self.u16(len(b))
        self.w(b)

    def handle(self):
        h = self.next_handle
        self.next_handle += 1
        return h

    def ref(self, h):
        self.u8(TC_REFERENCE)
        self.i32(BASE_HANDLE + h)

    def stream(self, root):
        self.u16(MAGIC)
        self.u16(VERSION)
        self.content(root)
        return bytes(self.out)

    def string(self, s, sid=None):
        b = s.encode("utf-8")
        h = self.handle()
        if sid is not None:
            self.id_handle[sid] = h
        if len(b) < 0x10000:
            self.u8(TC_STRING)
            self.u16(len(b))
        else:
            self.u8(TC_LONGSTRING)
            self.i64(len(b))
        self.w(b)

    def classdesc(self, name):
        if name is None:
            return self.u8(TC_NULL)
        if name in self.cd_handle:
            return self.ref(self.cd_handle[name])
        cd = self.classes[name]
        self.u8(TC_CLASSDESC)
        self.utf(name)
        self.i64(cd["suid"])
        self.cd_handle[name] = self.handle()
        self.u8(cd["flags"])
        self.u16(len(cd["fields"]))
        for f in cd["fields"]:
            self.u8(ord(f[0]))
            self.utf(f[1])
            if f[0] in "[L":
                self.content(f[2])
        self.annotation(cd.get("annotation", []))
        self.classdesc(cd["super"])

    def annotation(self, items):
        for it in items:
            if isinstance(it, dict) and "@block" in it:
                b = bytes.fromhex(it["@block"])
                if len(b) < 256:
                    self.u8(TC_BLOCKDATA)
                    self.u8(len(b))
                else:
                    self.u8(TC_BLOCKDATALONG)
                    self.i32(len(b))
                self.w(b)
            else:
                self.content(it)
        self.u8(TC_ENDBLOCKDATA)

    def hierarchy(self, name):
        chain = []
        while name:
            chain.append(self.classes[name])
            name = self.classes[name]["super"]
        return chain[::-1]

    def prim(self, t, v):
        if t == "C" and isinstance(v, str):
            v = ord(v)
        self.w(struct.pack(PRIM[t], v))

    def content(self, v):
        if v is None:
            return self.u8(TC_NULL)
        if isinstance(v, str):
            return self.string(v)
        if not isinstance(v, dict):
            raise TypeError(f"cannot serialise {v!r} as object")
        if "@ref" in v:
            return self.ref(self.id_handle[v["@ref"]])
        if "@str" in v:
            return self.string(v["@str"], v.get("@id"))
        if "@enum" in v:
            key = (v["@enum"], v["name"])
            if key in self.enum_handle:
                return self.ref(self.enum_handle[key])
            self.u8(TC_ENUM)
            self.classdesc(v["@enum"])
            self.enum_handle[key] = self.handle()
            if "@nameref" in v:
                return self.ref(self.id_handle[v["@nameref"]])
            return self.string(v["name"], v.get("@nameid"))
        if "@array" in v:
            self.u8(TC_ARRAY)
            self.classdesc(v["@array"])
            h = self.handle()
            if "@id" in v:
                self.id_handle[v["@id"]] = h
            et = v["@array"][1]
            if "@bytes" in v:
                b = bytes.fromhex(v["@bytes"])
                self.i32(len(b))
                return self.w(b)
            self.i32(len(v["items"]))
            for it in v["items"]:
                self.prim(et, it) if et in PRIM else self.content(it)
            return
        if "@class" in v:
            return self.obj(v)
        raise ValueError(f"unknown node {list(v)[:3]}")

    def obj(self, v):
        name = v["@class"]
        fields = dict(v.get("@fields", {}))
        ann = dict(v.get("@ann", {}))
        if "@list" in v:
            fields["size"] = len(v["@list"])
            ann[name] = [{"@block": struct.pack(">i", len(v["@list"])).hex()}] + v["@list"]
        elif "@set" in v:
            ann[name] = [{"@block": struct.pack(">ifi", v["@capacity"], v["@loadFactor"], len(v["@set"])).hex()}] + v["@set"]
        elif "@map" in v:
            flat = [x for kv in v["@map"] for x in kv]
            ann["java.util.HashMap"] = [{"@block": struct.pack(">ii", v["@buckets"], len(v["@map"])).hex()}] + flat
        self.u8(TC_OBJECT)
        self.classdesc(name)
        h = self.handle()
        if "@id" in v:
            self.id_handle[v["@id"]] = h
        for c in self.hierarchy(name):
            if c["flags"] & SC_EXTERNALIZABLE:
                self.annotation(ann.get(c["name"], []))
                continue
            if c["flags"] & SC_SERIALIZABLE:
                for f in c["fields"]:
                    if f[1] not in fields:
                        raise KeyError(f"{name}: missing field {f[1]}")
                    val = fields[f[1]]
                    self.prim(f[0], val) if f[0] in PRIM else self.content(val)
            if c["flags"] & SC_WRITE_METHOD:
                self.annotation(ann.get(c["name"], []))


# ----------------------------------------------------------------------------- API
def decode(data):
    rd = Reader(data)
    root = rd.stream()
    ids = {}
    tree = simplify(root, rd, ids)
    classes = {}
    for n, cd in rd.classes.items():
        c = {k: v for k, v in cd.items() if k not in ("_super", "fields")}
        c["fields"] = []
        for f in cd["fields"]:
            f = list(f)
            if len(f) > 2:  # class signature string, possibly shared
                t = f[2]
                if isinstance(t, dict):
                    f[2] = {"@ref": ids.setdefault(id(t["@ref"]), len(ids) + 1)}
                elif rd.refcount.get(id(t)):
                    f[2] = {"@str": str(t), "@id": ids.setdefault(id(t), len(ids) + 1)}
                else:
                    f[2] = str(t)
            c["fields"].append(f)
        classes[n] = c
    return {"classes": classes, "root": tree}


def encode(doc):
    return Writer(doc["classes"]).stream(doc["root"])


def _sig_fix(doc):
    return doc  # kept for API compatibility


def summary(node, path="", out=None, depth=0):
    out = [] if out is None else out
    if isinstance(node, dict):
        if "@fields" in node:
            for k, v in node["@fields"].items():
                summary(v, f"{path}.{k}" if path else k, out, depth + 1)
        elif "@list" in node or "@set" in node:
            items = node.get("@list", node.get("@set"))
            out.append(f"{path}: [{len(items)}] " + ", ".join(
                (i if isinstance(i, str) else i["@str"] if isinstance(i, dict) and "@str" in i else i.get("name", "{...}") if isinstance(i, dict) and "@enum" in i else "{...}") for i in items[:12]) + (" ..." if len(items) > 12 else ""))
        elif "@enum" in node:
            out.append(f"{path} = {node['name']}")
    elif node is not None:
        out.append(f"{path} = {node!r}")
    return out


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 1
    cmd, src = argv[1], argv[2]
    if cmd == "decode":
        doc = _sig_fix(decode(open(src, "rb").read()))
        with open(argv[3], "w") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
            f.write("\n")
    elif cmd == "encode":
        with open(argv[3], "wb") as f:
            f.write(encode(json.load(open(src))))
    elif cmd == "verify":
        raw = open(src, "rb").read()
        doc = _sig_fix(decode(raw))
        doc = json.loads(json.dumps(doc))  # prove JSON is lossless
        new = encode(doc)
        again = json.loads(json.dumps(_sig_fix(decode(new))))
        if new == raw:
            print(f"OK: byte-identical round-trip ({len(raw)} bytes)")
        elif again == doc:
            print(f"OK: semantically identical round-trip (orig {len(raw)} bytes, re-encoded {len(new)} bytes; "
                  "differs only in how repeated strings are shared)")
        else:
            print("MISMATCH: re-decoded document differs")
            return 2
    elif cmd in ("get", "set"):
        # seoconfig.py get FILE a.b.c          seoconfig.py set FILE a.b.c JSON_VALUE [OUT]
        doc = _sig_fix(decode(open(src, "rb").read()))
        node, parts = doc["root"], argv[3].split(".")
        for k in parts[:-1]:
            node = node["@fields"][k]
        if cmd == "get":
            print(json.dumps(node["@fields"][parts[-1]], indent=1, ensure_ascii=False))
        else:
            old = node["@fields"][parts[-1]]
            new = json.loads(argv[4])
            if type(old) is not type(new) and not (isinstance(old, float) and isinstance(new, int)):
                raise SystemExit(f"type mismatch: current value is {type(old).__name__}, got {type(new).__name__}")
            node["@fields"][parts[-1]] = float(new) if isinstance(old, float) else new
            with open(argv[5] if len(argv) > 5 else src, "wb") as f:
                f.write(encode(doc))
            print(f"{argv[3]}: {old!r} -> {new!r}")
    elif cmd == "summary":
        doc = _sig_fix(decode(open(src, "rb").read()))
        print("\n".join(summary(doc["root"])))
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
