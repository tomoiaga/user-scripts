// ==UserScript==
// @name         Jira Query Filter Gadget :: Sum('Any Numeric Column')
// @namespace    http://tomoiaga.ro
// @version      0.1
// @description  Adds a new Totals row in the header of any Jira issues table with the sum of numeric values in each column.
// @author       Vasile Tomoiaga
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?domain=https://www.tampermonkey.net/
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
            '.ghx-issuetable'
        ],

        ENRICH_EPIC_PAGE: true,

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

    function addTableHead(table) {
        if (table.querySelector('thead') == null) {
            var tBody = table.querySelector('tbody');
            if (tBody) {
                var head = document.createElement('thead');
                table.insertBefore(head, tBody);

                var firstBodyRow = tBody.querySelector('tr');
                if (firstBodyRow) {
                    var countCols = firstBodyRow.querySelectorAll('td').length;
                    var row = head.appendChild(document.createElement("tr"));
                    row.classList.add('rowHeader');

                    for (let i = 0; i < countCols; i += 1) {
                        var th = document.createElement("th");
                        th.innerText = '🔵';
                        row.appendChild(th);
                    }
                }
            }
        }
    }

    function sumNumericColumnFor(gadget) {
        addTableHead(gadget);
        const headerRow = gadget.querySelector('thead tr');
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


    function sumNumericColumn() {
        const gadgets = document.querySelectorAll(CONFIG.ISSUES_TABLES_SELECTOR.join());
        for (let i = 0; i < gadgets.length; i += 1) {
            sumNumericColumnFor(gadgets[i]);
        }
    }

    /* START REGION ENRICH EPIC PAGE */

    const detectEpicPage = () => {
        var isEpic = document.querySelectorAll('.type-gh-epic-label').length > 0;
        return isEpic;
    }

    async function readJqlJSON(jql) {
        const response = await fetch('/rest/api/latest/search?jql=' + jql);
        const issue = await response.json();
        return issue;
    }

    function enrichEpicPage() {
        const epicKey = document.querySelector('.issue-link').getAttribute('data-issue-key');
        readJqlJSON('"Epic Link"=' + epicKey).then(jsonResponse => {
            if (jsonResponse && jsonResponse.issues && jsonResponse.issues.length > 0) {
                for(var i=0; i<jsonResponse.issues.length; i += 1) {
                    const issueJson = jsonResponse.issues[i];
                    const story = {
                                key: issueJson.key,
                                effort: issueJson.fields.customfield_10006
                            };

                    var issueDom = document.querySelector('#ghx-issues-in-epic-table tr[data-issuekey="' + story.key + '"]');
                    var effortTD = document.createElement('td');
                    effortTD.classList.add('nav', 'effort');
                    effortTD.innerText = story.effort;
                    var tdActions = issueDom.querySelector('.issue_actions');
                    issueDom.insertBefore(effortTD, tdActions);
                }

                sumNumericColumnFor(document.querySelector('#ghx-issues-in-epic-table'));
            }
        });
    }

    /* END REGION ENRICH EPIC PAGE */

    function init() {
        sumNumericColumn();

        if (CONFIG.ENRICH_EPIC_PAGE && detectEpicPage()) {
            enrichEpicPage();
        }
    }

    const load = () => {
        const isJiraLocation = (new RegExp(CONFIG.URL_IDENTIFIER_FOR_JIRA)).test(location.href);
        if (isJiraLocation) {
            setTimeout(init, 1000 * 2);
        }
    }

    const log = (text) => {
        if (typeof window !== "undefined") {
            console.log(text);
        }
    }


    log('load event: adding');
    if (typeof window !== "undefined") {
        window.addEventListener('load', load);
        log('load event: added');
        //window.onload1 = load;
    }
}());
