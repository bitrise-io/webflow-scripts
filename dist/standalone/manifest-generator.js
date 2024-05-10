$(document).ready(function() {
    function e() {
        var e = $("nav.navigation").outerHeight(),
            a = `calc(100vh - ${e+64}px)`;
        $("#PrivacyManifestBlock").css({
            height: a,
            "max-height": a,
            top: `${e+32}px`
        })
    }

    function a() {
        var e = $("#NSPrivacyCollectedDataTypesSelect").val();
        if (o(), null !== e) {
            $("#NSPrivacyCollectedDataTypesForm").show();
            var a = C.find(a => a.key === e);
            a && ($("#NSPrivacyCollectedDataTypeLinked").prop("checked", a.linked), $("#NSPrivacyCollectedDataTypeTracking").prop("checked", a.tracking), a.purposes.forEach(e => {
                $(`#NSPrivacyCollectedDataTypePurpose${e}`).prop("checked", !0)
            }))
        } else $("#NSPrivacyCollectedDataTypesForm").hide()
    }

    function t() {
        var e = f.evaluate('//key[text()="NSPrivacyTracking"]', f, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        $(e.nextElementSibling).replaceWith(this.checked ? "<true/>" : "<false/>"), v()
    }

    function i() {
        u();
        var e = $("#" + $(this).val() + "Form");
        e.length > 0 && (e.show(), $("#NSPrivacyAccessedAPITypesButton").show())
    }

    function c() {
        var e = $("#NSPrivacyTrackingDomainsInput").val().trim();
        e && (N.push(e), $("#NSPrivacyTrackingDomainsInput").val(""), p(), P(), v())
    }

    function r() {
        var e = $(this).parent().data("domain-index");
        N.splice(e, 1), p(), P(), v(), $(this).closest(".padding-xxsmall").remove()
    }

    function n() {
        var e = $("#NSPrivacyCollectedDataTypesSelect").val(),
            t = $("#NSPrivacyCollectedDataTypesSelect option:selected").text(),
            i = $("#NSPrivacyCollectedDataTypeLinked").is(":checked"),
            c = $("#NSPrivacyCollectedDataTypeTracking").is(":checked"),
            r = ["NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising", "NSPrivacyCollectedDataTypePurposeDeveloperAdvertising", "NSPrivacyCollectedDataTypePurposeProductPersonalization", "NSPrivacyCollectedDataTypePurposeAnalytics", "NSPrivacyCollectedDataTypePurposeAppFunctionality", "NSPrivacyCollectedDataTypePurposeOther"].filter(e => $(`#${e}`).is(":checked")).map(e => e.replace("NSPrivacyCollectedDataTypePurpose", "")),
            n = C.findIndex(a => a.key === e),
            o = {
                key: e,
                name: t,
                linked: i,
                tracking: c,
                purposes: r
            }; - 1 !== n ? C[n] = o : C.push(o), d(), v(), s(), $("#NSPrivacyCollectedDataTypesSelect").val("").find("option:first").prop("selected", !0), a()
    }

    function o() {
        $("#NSPrivacyCollectedDataTypeLinked").prop("checked", !1), $("#NSPrivacyCollectedDataTypeTracking").prop("checked", !1), $('input[type="checkbox"][id^="NSPrivacyCollectedDataTypePurpose"]').prop("checked", !1)
    }

    function l() {
        var e = this.id.replace("NSPrivacyDataTypeRemove-", ""),
            a = C.findIndex(a => a.key === e); - 1 !== a && (C.splice(a, 1), d(), v(), $(this).closest(".padding-xxsmall").remove())
    }

    function s() {
        $("#NSPrivacyCollectedDataTypesList").empty(), C.forEach(function(e) {
            var a = e.linked ? "Linked to user's identity" : "Not linked to user's identity",
                t = e.tracking ? "Used for tracking" : "Not used for tracking",
                i = e.purposes.join(", "),
                c = `<div class="display-flex flex-direction-vertical padding-xxsmall corner-radius-8px background-color-gray-hover"><div class="display-flex flex-direction-horizontal"><div class="flex-grow"><strong>${e.name}</strong></div><div class="max-width-1-5rem background-grey" style="cursor: pointer;" id="NSPrivacyDataTypeRemove-${e.key}"></div></div><div class="flex-grow">${a}, ${t}</div><div class="flex-grow">${i}</div></div>`;
            $("#NSPrivacyCollectedDataTypesList").append(c)
        })
    }

    function d() {
        for (var e = f.evaluate('//key[text()="NSPrivacyCollectedDataTypes"]/following-sibling::*[1]', f, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; e.firstChild;) e.removeChild(e.firstChild);
        C.forEach(function(a) {
            var t = f.createElement("dict"),
                i = f.createElement("key"),
                c = f.createElement("string");
            i.textContent = "NSPrivacyCollectedDataType", c.textContent = a.key, t.appendChild(i), t.appendChild(c);
            var r = f.createElement("key"),
                n = f.createElement(a.linked);
            r.textContent = "NSPrivacyCollectedDataTypeLinked", t.appendChild(r), t.appendChild(n);
            var o = f.createElement("key"),
                l = f.createElement(a.tracking);
            o.textContent = "NSPrivacyCollectedDataTypeTracking", t.appendChild(o), t.appendChild(l);
            var s = f.createElement("key"),
                d = f.createElement("array");
            s.textContent = "NSPrivacyCollectedDataTypePurposes", t.appendChild(s), t.appendChild(d), a.purposes.forEach(e => {
                var a = f.createElement("string");
                a.textContent = e, d.appendChild(a)
            }), e.appendChild(t)
        })
    }

    function p() {
        var e = f.evaluate('//key[text()="NSPrivacyTrackingDomains"]', f, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.nextElementSibling;
        $(e).empty(), N.forEach(a => $(e).append(`<string>${a}</string>`))
    }

    function y() {
        var e = $("#NSPrivacyCollectedDataTypesSelect"),
            t = e.find("option").clone(),
            i = {};
        e.empty(), $("<option>", {
            text: "Select NSPrivacyCollectionDataTypes",
            value: "",
            disabled: !0,
            selected: !0
        }).appendTo(e), t.each(function() {
            var e = $(this).text(),
                [a, t] = e.split(":").map(e => e.trim());
            i[a] || (i[a] = []), i[a].push([t, $(this).val()])
        }), e.find("option:not(:first)").remove(), Object.keys(i).forEach(a => {
            var t = $("<optgroup>", {
                label: a
            }).appendTo(e);
            i[a].forEach(e => {
                $("<option>", {
                    text: e[0],
                    value: e[1]
                }).appendTo(t)
            })
        }), a()
    }

    function v() {
        $("code").text(vkbeautify.xml(D + (new XMLSerializer).serializeToString(f)))
    }

    function P() {
        $("#NSPrivacyTrackingDomainsList").empty(), N.forEach(function(e, a) {
            $("#NSPrivacyTrackingDomainsList").append(`<div class="display-flex flex-direction-horizontal padding-xxsmall corner-radius-8px background-color-gray-hover" data-domain-index="${a}"><p class="flex-grow"><strong>${e}</strong></p><div style="width: 1.5rem; height: 1.5rem; background-color: red; cursor: pointer;" id="NSPrivacyTrackingDomainRemove-${a}"></div></div>`)
        })
    }

    function u() {
        $(["#NSPrivacyAccessedAPICategoryFileTimestampForm", "#NSPrivacyAccessedAPICategorySystemBootTimeForm", "#NSPrivacyAccessedAPICategoryDiskSpaceForm", "#NSPrivacyAccessedAPICategoryActiveKeyboardsForm", "#NSPrivacyAccessedAPICategoryUserDefaultsForm"].join(", ")).hide(), $("#NSPrivacyAccessedAPITypesButton").hide()
    }

    function h() {
        var e = $("#NSPrivacyAccessedAPITypesInput").val();
        $("#NSPrivacyAccessedAPITypesInput option:selected").text();
        x[e] = [], $(`#${e}Form input[type="checkbox"]:checked`).each(function() {
            x[e].push($(this).attr("id"))
        });
        for (var a = f.evaluate('//key[text()="NSPrivacyAccessedAPITypes"]/following-sibling::array[1]', f, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; a.firstChild;) a.removeChild(a.firstChild);
        Object.keys(x).forEach(e => {
            S(a, e, x[e])
        }), g(), v(), u(), $("#NSPrivacyAccessedAPITypesInput").val("").find("option:first").prop("selected", !0), window.scrollTo(0, $("#PrivacyManifestSetup")[0].scrollHeight)
    }

    function S(e, a, t) {
        var i = f.createElement("dict");
        e.appendChild(i);
        var c = f.createElement("key");
        c.textContent = "NSPrivacyAccessedAPIType";
        var r = f.createElement("string");
        r.textContent = a;
        var n = f.createElement("key");
        n.textContent = "NSPrivacyAccessedAPITypeReasons";
        var o = f.createElement("array");
        i.append(c, r, n, o), t.forEach(e => {
            var a = f.createElement("string");
            a.textContent = e, o.appendChild(a)
        })
    }

    function g() {
        $("#NSPrivacyAccessedAPITypesButtonList").empty(), Object.keys(x).forEach(e => {
            var a = $('#NSPrivacyAccessedAPITypesInput option[value="' + e + '"]').text(),
                t = x[e].join(", "),
                i = `\n            <div class="display-flex flex-direction-vertical padding-xxsmall corner-radius-8px background-color-gray-hover">\n            <div class="display-flex flex-direction-horizontal">\n            <div class="flex-grow"><strong>${a}</strong></div>\n            <div class="max-width-1-5rem background-grey" style="cursor: pointer;" id="NSPrivacyAccessedAPIRemove-${e}"></div>\n            </div>\n            <div class="flex-grow">${t}</div>\n            </div>`;
            $("#NSPrivacyAccessedAPITypesButtonList").append(i)
        })
    }

    function T() {
        var e = $(this).attr("id").split("-")[1];
        delete x[e], k(e), g(), v()
    }

    function k(e) {
        var a = f.evaluate('//key[text()="NSPrivacyAccessedAPITypes"]/following-sibling::array[1]', f, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
            t = Array.from(a.children);
        const i = t.find(a => a.getElementsByTagName("string")[0].textContent === e);
        i && a.removeChild(i)
    }

    function m() {
        var e = new XMLSerializer,
            a = e.serializeToString(f),
            t = vkbeautify.xml(D + a),
            i = new Blob([t], {
                type: "application/xml"
            }),
            c = URL.createObjectURL(i),
            r = document.createElement("a");
        r.href = c, r.download = "PrivacyInfo.xcprivacy", document.body.appendChild(r), r.click(), document.body.removeChild(r), URL.revokeObjectURL(c)
    }
    var f = $.parseXML('<plist version="1.0"><dict><key>NSPrivacyTracking</key><false/><key>NSPrivacyTrackingDomains</key><array/><key>NSPrivacyCollectedDataTypes</key><array/><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>'),
        N = [],
        C = [],
        x = [],
        D = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';
    y(), v(), u(), $("#NSPrivacyTracking").change(t), $("#NSPrivacyAccessedAPITypesInput").change(i), $("#NSPrivacyTrackingDomainsButton").click(c), $("#NSPrivacyTrackingDomainsList").on("click", "[id^=NSPrivacyTrackingDomainRemove-]", r), $("#NSPrivacyCollectedDataTypesButton").click(n), $("#NSPrivacyCollectedDataTypesList").on("click", "[id^=NSPrivacyDataTypeRemove-]", l), $("#NSPrivacyCollectedDataTypesSelect").change(a), $("#NSPrivacyAccessedAPITypesButton").click(h), $("#NSPrivacyAccessedAPITypesButtonList").on("click", "[id^=NSPrivacyAccessedAPIRemove-]", T), $("#NSPrivacyDownload").click(m), $(window).resize(e), e(), $("code").css({
        "white-space": "pre-wrap",
        "word-wrap": "break-word",
        "background-color": "var(--neutral-95)",
        color: "var(--neutral-30)",
        "font-size": "0.8rem",
        "line-height": "1rem",
        "font-family": "IBM Plex Mono"
    }), $("pre").css({
        "background-color": "var(--neutral-95)"
    }), $("#NSPrivacyAccessedAPITypesInput").prepend($("<option>", {
        text: "Select NSPrivacyAccessDataTypes",
        value: "",
        selected: !0,
        disabled: !0
    }))
});
