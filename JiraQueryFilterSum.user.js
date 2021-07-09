// ==UserScript==
// @name         Jira Query Filter Gadget :: Sum('Any Numeric Column')
// @namespace    http://tomoiaga.ro
// @version      0.1
// @description  Adds a new Totals row in the header of any Jira issues table with the sum of numeric values in each column.
// @author       Vasile Tomoiaga
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?domain=
// @grant        none
// ==/UserScript==
(function() {
    const CONFIG = {
        /* the script will run only on URLs that contain this identifier, ex: http://jira.mycompany.com */
        URL_IDENTIFIER_FOR_JIRA: 'jira',

        /* CSS selectors for the tables where we want a SUM column in the header */
        ISSUES_TABLES_SELECTOR: [
            'div.gadget',
            '.results-panel',
        ],

        /* Text to display in header Sum row when the column has no numeric values */
        NA: 'n/a'
    };

    function getIntegerArray(arrayLength) {
        const array = [];

        for (let i = 0; i < arrayLength; i += 1) {
            array[i] = 0;
        }

        return array;
    }

    function isInteger(value) {
        return /^\d+$/.test(value);
    }

    function appendSumRow(array, headerRow) {
        let newRow = document.createElement('tr');

        for (let y = 0; y < array.length; y += 1) {
            const cell = newRow.appendChild(document.createElement('th'));
            cell.innerText = (array[y] > 0) ? array[y] : CONFIG.NA;
        }

        headerRow.parentElement.appendChild(newRow);
    }

    function parseCellsForIntegers(cells, array) {
        if (!cells || !cells.length) {
            return;
        }

        for (let k = 0; k < cells.length; k += 1) {
            const cell = cells[k];
            if (cell.innerText && cell.innerText.length > 0 && isInteger(cell.innerText)) {
                const effortInt = parseInt(cell.innerText, 10);
                if (!isNaN(effortInt)) {
                    array[k] += effortInt;
                }
            }
        }
    }

    function sumNumericColumn() {
        const gadgets = document.querySelectorAll(CONFIG.ISSUES_TABLES_SELECTOR.join());
        let headerRow;
        for (let i = 0; i < gadgets.length; i += 1) {
            let gadget = gadgets[i];
            headerRow = gadget.querySelector('thead tr');
            if (headerRow == null) continue;

            let issueRows = gadget.querySelectorAll('tbody tr');
            if (issueRows.length > 0) {
                let sumArray = getIntegerArray(headerRow.querySelectorAll('th').length);

                for (let j = 0; j < issueRows.length; j += 1) {
                    const cells = issueRows[j].children;
                    parseCellsForIntegers(cells, sumArray);
                }

                if (sumArray.filter((x) => x > 0).length > 0) {
                    appendSumRow(sumArray, headerRow);
                }
            }
        }
    }

    function init(secondsDelay) {
        setTimeout(sumNumericColumn, 1000 * secondsDelay);
    }

    if (typeof window !== "undefined") {
        window.onload = function() {
            const isJiraLocation = (new RegExp(CONFIG.URL_IDENTIFIER_FOR_JIRA)).test(location.href);
            if (isJiraLocation) {
                init(3);
            }
        }
    }
}());
