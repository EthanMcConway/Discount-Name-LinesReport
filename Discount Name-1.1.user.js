// ==UserScript==
// @name         Discount Name
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fetches discount information from sale items and displays it in the Source column on Lines report
// @author       Etooooo
// @match        https://*.merchantos.com/*name=reports.sales.listings.transaction_line*
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @connect      *.merchantos.com
// @updateURL    https://raw.githubusercontent.com/Etoooooooo/Discount-Name-LinesReport/main/discount-name.user.js
// @downloadURL  https://raw.githubusercontent.com/Etoooooooo/Discount-Name-LinesReport/main/discount-name.user.js
// ==/UserScript==

(function() {
    'use strict';

    const accountID = document.querySelector('#help_account_id var')?.innerText.trim();

    if (!accountID) {
        GM_log('Failed to retrieve account ID');
        return;
    }

    const rows = Array.from(document.querySelectorAll('tbody tr[data-automation-id^="rowSalesLines_"]'));
    const saleDataMap = new Map();

    rows.forEach(row => {
        const saleID = row.querySelector('td[id^="cellSalesLinesID_"] a')?.innerText.trim();
        const description = row.querySelector('td[id^="cellSalesLinesDescription_"] span')?.innerText.trim();
        if (saleID && description) {
            if (!saleDataMap.has(saleID)) {
                saleDataMap.set(saleID, []);
            }
            saleDataMap.get(saleID).push({ row, description });
        }
    });

    if (saleDataMap.size === 0) {
        GM_log('No sale IDs found');
        return;
    }

    saleDataMap.forEach((items, saleID) => {
        const url = `https://${location.hostname}/API/Account/${accountID}/Sale/${saleID}.json?load_relations=all`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    const saleLines = Array.isArray(data.Sale.SaleLines.SaleLine) ? data.Sale.SaleLines.SaleLine : [data.Sale.SaleLines.SaleLine];

                    saleLines.forEach(saleLine => {
                        const discount = saleLine.Discount;
                        const itemDescription = saleLine.Item?.description?.trim().toLowerCase();
                        if (discount && itemDescription) {
                            const match = items.find(i => simplifyDescription(i.description) === simplifyDescription(itemDescription));
                            if (match) {
                                const discountPercent = (discount.discountPercent * 100).toFixed(2) + '%';
                                const discountInfo = `Name: ${discount.name}<br>Amount: £${discount.discountAmount}<br>Percent: ${discountPercent}`;
                                const sourceCell = match.row.querySelector('td[id^="cellSalesLinesSource_"]');
                                if (sourceCell) {
                                    sourceCell.innerHTML = discountInfo;
                                }
                            }
                        }
                    });
                } catch (e) {
                    GM_log('Error parsing JSON or processing data: ' + e.message);
                }
            },
            onerror: function() {
                GM_log('Failed to fetch data for sale ID ' + saleID);
            }
        });
    });

    function simplifyDescription(description) {
        return description.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    }
})();