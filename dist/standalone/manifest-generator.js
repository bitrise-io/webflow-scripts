$(document).ready(function() {
    var xmlDoc = $.parseXML('<plist version="1.0"><dict><key>NSPrivacyTracking</key><false/><key>NSPrivacyTrackingDomains</key><array/><key>NSPrivacyCollectedDataTypes</key><array/><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>'),
    domainArray = [],
    dataTypesArray = [],
    apiRequirementsArray = [],
    xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    xSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.0001 13.4143L16.5427 17.9569C16.5427 17.9569 16.543 17.9572 17.2501 17.2501C17.9572 16.543 17.9572 16.5429 17.9571 16.5429L13.4143 12.0001L17.9572 7.45718L16.543 6.04297L12.0001 10.5859L7.45718 6.04297L6.04297 7.45718L10.5859 12.0001L6.04297 16.543L7.45718 17.9572L12.0001 13.4143Z" fill="#2B0E3F"/></svg>';
    
    populateSelect();
    updateDisplay();
    formsToHide();
    
    
    $('#NSPrivacyTracking').change(toggleNSPrivacyTracking);
    $('#NSPrivacyAccessedAPITypesInput').change(showRelevantForm);
    $('#NSPrivacyTrackingDomainsButton').click(addDomain);
    $('#NSPrivacyTrackingDomainsList').on('click', '[id^=NSPrivacyTrackingDomainRemove-]', removeDomain);
    $('#NSPrivacyCollectedDataTypesButton').click(addOrUpdateDataType);
    $('#NSPrivacyCollectedDataTypesList').on('click', '[id^=NSPrivacyDataTypeRemove-]', removeDataType);
    $('#NSPrivacyCollectedDataTypesSelect').change(showCollectedDataTypesForm);
    $('#NSPrivacyAccessedAPITypesButton').click(storeAccessedApiTypes);
    $('#NSPrivacyAccessedAPITypesButtonList').on('click', '[id^=NSPrivacyAccessedAPIRemove-]', removeApiType);
    $('#NSPrivacyDownload').click(downloadXmlContent);
    $(window).resize(adjustMinHeight);
    
    adjustMinHeight();
    
    $('code').css({
        'white-space': 'pre-wrap',
        'word-wrap': 'break-word',
        'background-color': 'var(--neutral-95)',
        'color': 'var(--neutral-30)',
        'font-size': '0.8rem',
        'line-height': '1rem',
        'font-family': 'IBM Plex Mono'
    });
    $('pre').css({
        'background-color': 'var(--neutral-95)'
    });
    
    function adjustMinHeight() {
        var navHeight = $('nav.navigation').outerHeight(); // Get the outer height of the nav element
        var height = `calc(100vh - ${navHeight + 64}px)`; // Calculate new min-height
        
        $('#PrivacyManifestBlock').css({
            'height': height,
            'max-height': height,
            top: `${navHeight+32}px`
        }); // Set the new min-height
    }
    
    $('#NSPrivacyAccessedAPITypesInput').prepend($('<option>', {
        text: 'Select NSPrivacyAccessDataTypes', // Placeholder text
        value: '', // No value, it's a placeholder
        selected: true, // Make it selected by default
        disabled: true // Disable selection of the placeholder
    }));
    
    function toggleButtonState() {
        var inputVal = $('#NSPrivacyTrackingDomainsInput').val();
        $('#NSPrivacyTrackingDomainsButton').prop('disabled', inputVal.trim() === '');
    }
    
    function showCollectedDataTypesForm() {
        var selectedTypeKey = $('#NSPrivacyCollectedDataTypesSelect').val();
        
        resetInputFields();
        if (selectedTypeKey !== null) {
            $('#NSPrivacyCollectedDataTypesForm').show();
            
            // Check if the selected type is already in the dataTypesArray
            var existingEntry = dataTypesArray.find(entry => entry.key === selectedTypeKey);
            
            if (existingEntry) {
                // Set the checkbox states based on the existing entry
                $('#NSPrivacyCollectedDataTypeLinked').prop('checked', existingEntry.linked);
                $('#NSPrivacyCollectedDataTypeTracking').prop('checked', existingEntry.tracking);
                
                // Check the corresponding purpose checkboxes
                existingEntry.purposes.forEach(purpose => {
                    $(`#NSPrivacyCollectedDataTypePurpose${purpose}`).prop('checked', true);
                });
            }
        } else {
            $('#NSPrivacyCollectedDataTypesForm').hide();
        }
    }
    
    function toggleNSPrivacyTracking() {
        var keyNode = xmlDoc.evaluate('//key[text()="NSPrivacyTracking"]', xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        $(keyNode.nextElementSibling).replaceWith(this.checked ? '<true/>' : '<false/>');
        updateDisplay();
    }
    
    function showRelevantForm() {
        formsToHide();
        var formToShow = $('#' + $(this).val() + 'Form');
        
        if (formToShow.length > 0) {
            formToShow.show();
            $('#NSPrivacyAccessedAPITypesButton').show();
        }
    }
    
    function addDomain() {
        var domain = $('#NSPrivacyTrackingDomainsInput').val().trim();
        if (domain) {
            domainArray.push(domain);
            $('#NSPrivacyTrackingDomainsInput').val('');
            updateDomainXML();
            displayDomain();
            updateDisplay();
        }
    }
    
    function removeDomain() {
        var index = $(this).parent().data('domain-index');
        domainArray.splice(index, 1);
        updateDomainXML();
        displayDomain();
        updateDisplay();
        $(this).closest('.padding-xxsmall').remove();
    }
    
    function addOrUpdateDataType() {
        var key = $('#NSPrivacyCollectedDataTypesSelect').val(),
        name = $('#NSPrivacyCollectedDataTypesSelect option:selected').text(),
        isLinkedChecked = $('#NSPrivacyCollectedDataTypeLinked').is(':checked'),
        isTrackingChecked = $('#NSPrivacyCollectedDataTypeTracking').is(':checked'),
        purposes = ['NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising', 'NSPrivacyCollectedDataTypePurposeDeveloperAdvertising', 'NSPrivacyCollectedDataTypePurposeProductPersonalization', 'NSPrivacyCollectedDataTypePurposeAnalytics', 'NSPrivacyCollectedDataTypePurposeAppFunctionality', 'NSPrivacyCollectedDataTypePurposeOther'].filter(p => $(`#${p}`).is(':checked')).map(p => p.replace('NSPrivacyCollectedDataTypePurpose', '')),
        index = dataTypesArray.findIndex(el => el.key === key),
        entry = { key, name, linked: isLinkedChecked, tracking: isTrackingChecked, purposes };
        
        if (index !== -1) {
            dataTypesArray[index] = entry;
        } else {
            dataTypesArray.push(entry);
        }
        updateXMLWithDataType();
        updateDisplay();
        displayDataType();
        $('#NSPrivacyCollectedDataTypesSelect').val('').find('option:first').prop('selected', true);
        showCollectedDataTypesForm();
    }
    
    function resetInputFields() {
        // Reset checkboxes
        $('#NSPrivacyCollectedDataTypeLinked').prop('checked', false);
        $('#NSPrivacyCollectedDataTypeTracking').prop('checked', false);
        $('input[type="checkbox"][id^="NSPrivacyCollectedDataTypePurpose"]').prop('checked', false);
    }
    
    function removeDataType() {
        var key = this.id.replace('NSPrivacyDataTypeRemove-', ''),
        index = dataTypesArray.findIndex(el => el.key === key);
        if (index !== -1) {
            dataTypesArray.splice(index, 1);
            updateXMLWithDataType();
            updateDisplay();
            $(this).closest('.padding-xxsmall').remove();
        }
    }
    
    function displayDataType() {
        $('#NSPrivacyCollectedDataTypesList').empty(); // Clear the display area
        dataTypesArray.forEach(function(entry) {
            var linkedText = entry.linked ? "Linked to user's identity" : "Not linked to user's identity",
            trackingText = entry.tracking ? "Used for tracking" : "Not used for tracking",
            purposesText = entry.purposes.join(', '),
            htmlContent = `<div class="display-flex flex-direction-vertical padding-xxsmall corner-radius-8px background-color-gray-hover"><div class="display-flex flex-direction-horizontal"><div class="flex-grow"><strong>${entry.name}</strong></div><div style="cursor: pointer;" id="NSPrivacyDataTypeRemove-${entry.key}">${xSvg}</div></div><div class="flex-grow">${linkedText}, ${trackingText}</div><div class="flex-grow">${purposesText}</div></div>`;
            $('#NSPrivacyCollectedDataTypesList').append(htmlContent);
        });
    }
    
    function updateXMLWithDataType() {
        var dataTypesNode = xmlDoc.evaluate('//key[text()="NSPrivacyCollectedDataTypes"]/following-sibling::*[1]', xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        while (dataTypesNode.firstChild) {
            dataTypesNode.removeChild(dataTypesNode.firstChild);
        }
        dataTypesArray.forEach(function(type) {
            var dict = xmlDoc.createElement('dict'),
            keyElement = xmlDoc.createElement('key'),
            stringElement = xmlDoc.createElement('string');
            keyElement.textContent = 'NSPrivacyCollectedDataType';
            stringElement.textContent = type.key;
            dict.appendChild(keyElement);
            dict.appendChild(stringElement);
            
            var linkedKey = xmlDoc.createElement('key'),
            linkedValue = xmlDoc.createElement(type.linked);
            linkedKey.textContent = 'NSPrivacyCollectedDataTypeLinked';
            dict.appendChild(linkedKey);
            dict.appendChild(linkedValue);
            
            
            var trackingKey = xmlDoc.createElement('key'),
            trackingValue = xmlDoc.createElement(type.tracking);
            trackingKey.textContent = 'NSPrivacyCollectedDataTypeTracking';
            dict.appendChild(trackingKey);
            dict.appendChild(trackingValue);
            
            var purposesKey = xmlDoc.createElement('key'),
            purposesArray = xmlDoc.createElement('array');
            purposesKey.textContent = 'NSPrivacyCollectedDataTypePurposes';
            dict.appendChild(purposesKey);
            dict.appendChild(purposesArray);
            type.purposes.forEach(purpose => {
                var purposeString = xmlDoc.createElement('string');
                purposeString.textContent = purpose;
                purposesArray.appendChild(purposeString);
            });
            dataTypesNode.appendChild(dict);
        });
    }
    
    function updateDomainXML() {
        var domainsNode = xmlDoc.evaluate('//key[text()="NSPrivacyTrackingDomains"]', xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.nextElementSibling;
        $(domainsNode).empty();
        domainArray.forEach(d => $(domainsNode).append(`<string>${d}</string>`));
    }
    
    function populateSelect() {
        var select = $('#NSPrivacyCollectedDataTypesSelect');
        var options = select.find('option').clone();
        var categoriesMap = {};
        
        select.empty();
        $('<option>', {
            text: 'Select NSPrivacyCollectionDataTypes', // Placeholder text
            value: '', // No value, it's a placeholder
            disabled: true, // Disable selection
            selected: true // Make it selected by default
        }).appendTo(select);
        
        // Parse existing options to categorize
        options.each(function() {
            var text = $(this).text();
            var [category, name] = text.split(':').map(s => s.trim());
            if (!categoriesMap[category]) {
                categoriesMap[category] = [];
            }
            categoriesMap[category].push([name, $(this).val()]);
        });
        
        // Clear existing options except for the first placeholder
        select.find('option:not(:first)').remove();
        
        // Rebuild options with categories as groups
        Object.keys(categoriesMap).forEach(category => {
            var group = $('<optgroup>', { label: category }).appendTo(select);
            categoriesMap[category].forEach(opt => {
                $('<option>', { text: opt[0], value: opt[1] }).appendTo(group);
            });
        });
        
        showCollectedDataTypesForm();
    }
    
    function updateDisplay() {
        $('code').text(vkbeautify.xml(xmlHeader + new XMLSerializer().serializeToString(xmlDoc)));
    }
    
    function displayDomain() {
        $('#NSPrivacyTrackingDomainsList').empty();
        domainArray.forEach(function(domain, idx) {
            $('#NSPrivacyTrackingDomainsList').append(`<div class="display-flex flex-direction-horizontal padding-xxsmall corner-radius-8px background-color-gray-hover" data-domain-index="${idx}"><p class="flex-grow"><strong>${domain}</strong></p><div style="cursor: pointer;" id="NSPrivacyTrackingDomainRemove-${idx}">${xSvg}</div></div>`);
        });
    }
    
    function formsToHide() {
        $(['#NSPrivacyAccessedAPICategoryFileTimestampForm', '#NSPrivacyAccessedAPICategorySystemBootTimeForm', '#NSPrivacyAccessedAPICategoryDiskSpaceForm', '#NSPrivacyAccessedAPICategoryActiveKeyboardsForm', '#NSPrivacyAccessedAPICategoryUserDefaultsForm'].join(', ')).hide();
        $('#NSPrivacyAccessedAPITypesButton').hide();
    }
    
    function storeAccessedApiTypes() {
        var apiType = $('#NSPrivacyAccessedAPITypesInput').val();
        var apiLabel = $('#NSPrivacyAccessedAPITypesInput option:selected').text();  // Assuming a dropdown
        
        // Initialize or reset the array for this API type
        apiRequirementsArray[apiType] = [];
        $(`#${apiType}Form input[type="checkbox"]:checked`).each(function() {
            apiRequirementsArray[apiType].push($(this).attr('id'));
        });
        
        var accessedTypesNode = xmlDoc.evaluate('//key[text()="NSPrivacyAccessedAPITypes"]/following-sibling::array[1]', xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        
        // Clear existing XML entries to rebuild from the updated array
        while (accessedTypesNode.firstChild) {
            accessedTypesNode.removeChild(accessedTypesNode.firstChild);
        }
        
        // Rebuild the XML and update display
        Object.keys(apiRequirementsArray).forEach(type => {
            // Create XML structure
            appendApiTypeToXml(accessedTypesNode, type, apiRequirementsArray[type]);
        });
        
        // Update the display in the UI
        updateApiTypesDisplay();
        updateDisplay(); // Update the XML display
        
        formsToHide();
        $('#NSPrivacyAccessedAPITypesInput').val('').find('option:first').prop('selected', true);
        window.scrollTo(0,$("#PrivacyManifestSetup")[0].scrollHeight);
    }
    
    function appendApiTypeToXml(parentNode, type, reasons) {
        var dictElement = xmlDoc.createElement('dict');
        parentNode.appendChild(dictElement);
        
        var apiTypeKey = xmlDoc.createElement('key');
        apiTypeKey.textContent = "NSPrivacyAccessedAPIType";
        var apiTypeValue = xmlDoc.createElement('string');
        apiTypeValue.textContent = type;
        var reasonsKey = xmlDoc.createElement('key');
        reasonsKey.textContent = "NSPrivacyAccessedAPITypeReasons";
        var reasonsArray = xmlDoc.createElement('array');
        
        dictElement.append(apiTypeKey, apiTypeValue, reasonsKey, reasonsArray);
        reasons.forEach(reason => {
            var reasonElement = xmlDoc.createElement('string');
            reasonElement.textContent = reason;
            reasonsArray.appendChild(reasonElement);
        });
    }
    
    function updateApiTypesDisplay() {
        $('#NSPrivacyAccessedAPITypesButtonList').empty();  // Clear existing entries
        
        Object.keys(apiRequirementsArray).forEach(type => {
            var apiLabel = $('#NSPrivacyAccessedAPITypesInput option[value="' + type + '"]').text(); // Get label from dropdown
            var reasonTexts = apiRequirementsArray[type].join(', '); // Create a string of all reasons
            
            var contentHtml = `
<div class="display-flex flex-direction-vertical padding-xxsmall corner-radius-8px background-color-gray-hover">
<div class="display-flex flex-direction-horizontal">
<div class="flex-grow"><strong>${apiLabel}</strong></div>
<div style="cursor: pointer;" id="NSPrivacyAccessedAPIRemove-${type}">${xSvg}</div>
</div>
<div class="flex-grow">${reasonTexts}</div>
</div>`;
            $('#NSPrivacyAccessedAPITypesButtonList').append(contentHtml);
        });
    }
    
    
    function removeApiType() {
        var typeId = $(this).attr('id').split('-')[1];
        delete apiRequirementsArray[typeId];
        removeApiTypeFromXml(typeId);
        updateApiTypesDisplay();
        updateDisplay();
    }
    
    function removeApiTypeFromXml(apiType) {
        var accessedTypesNode = xmlDoc.evaluate('//key[text()="NSPrivacyAccessedAPITypes"]/following-sibling::array[1]', xmlDoc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        var children = Array.from(accessedTypesNode.children);
        const dictToRemove = children.find(dict => dict.getElementsByTagName('string')[0].textContent === apiType);
        if (dictToRemove) {
            accessedTypesNode.removeChild(dictToRemove);
        }
    }
    
    function downloadXmlContent() {
        // Serialize the XML document to a string
        var serializer = new XMLSerializer();
        var xmlString = serializer.serializeToString(xmlDoc);
        
        // Combine the header with the serialized XML
        var fullXmlContent =  vkbeautify.xml(xmlHeader + xmlString);
        
        // Create a Blob from the combined and formatted XML content
        var blob = new Blob([fullXmlContent], {type: 'application/xml'});
        
        // Generate a URL from the Blob
        var url = URL.createObjectURL(blob);
        
        // Create a temporary link element and trigger the download
        var downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'PrivacyInfo.xcprivacy'; // Name of the file to be downloaded
        
        // Append the link to the body, trigger the download, and then remove the link
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Free up the memory by revoking the created URL
        URL.revokeObjectURL(url);
    }
});
