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
    'use strict';

    let currentUrl = document.location.href;

    const CONFIG = {
        /* the script will run only on URLs that contain this identifier, ex: http://jira.mycompany.com */
        URL_IDENTIFIER_FOR_JIRA: 'jira',

        RUN_EVERY_SECONDS : 10, //seconds

        /* CSS selectors for the tables where we want a SUM column in the header */
        ISSUES_TABLES_SELECTOR: [
            'div.gadget',
            '.results-panel',
            '.ghx-issuetable'
        ],

        ENRICH_FILTER_RESULTS: true,

        ENRICH_EPIC_PAGE: true,

        ENRICH_SCRUM_BOARD : true,

        ENRICH_KANBAN_BOARD : true,

        /* Text to display in header Sum row when the column has no numeric values */
        NA: 'n/a',

        HEADER_TITLE_PLACEHOLDER: '🟢'
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
        const SUM_ROW_CLASS = 'custom-row-sum';
        var existingRow = headerRow.parentElement.querySelector('.' + SUM_ROW_CLASS);
        if (existingRow && existingRow.parentElement) {
            existingRow.parentElement.removeChild(existingRow);
        }

        let newRow = document.createElement('tr');
        newRow.classList.add('rowHeader', SUM_ROW_CLASS);

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

    function appendTH(parent, innerText, classList) {
        var th = document.createElement("th");
        th.innerText = innerText;
        if (classList) {
            th.classList.add(...classList);
        }
        parent.appendChild(th);
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
                    row.classList.add('rowHeader', 'custom-row-labels');

                    for (let i = 0; i < countCols; i += 1) {
                        appendTH(row, CONFIG.HEADER_TITLE_PLACEHOLDER, '');
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
            log('➡ sumNumericColumn');
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

    function getSprintValue(sprints) {
        if (sprints && sprints.length && sprints.length > 0) {
            var sprintVerbose = sprints[sprints.length-1];
            const regexp = /(\w*)=(.+?(?=[,\]]))/g;    //https://regex101.com/
            const array = [...sprintVerbose.matchAll(regexp)];
            if (array && array.length && array.length > 0) {
                var nameElement = array.find(e => e.length && e.length == 3 && e[1] == 'name');
                if (nameElement) {
                    return nameElement[2];
                }
            }
        }
        return null;
    }

    function createTD(innerText, classList) {
        var td = document.createElement('td');
        if (classList) {
            for (let i=0; i<classList.length; i += 1)
            {
                td.classList.add(classList[i]);
            }
        }
        td.innerText = innerText;
        return td;
    }

    function enrichEpicPage() {
        log('➡ enrichEpicPage');
        //if column exists, then return;
        var thSprint = document.querySelector('.custom-row-labels .sprint');
        if (thSprint != null) {
            return;
        }

        const epicKey = document.querySelector('.issue-link').getAttribute('data-issue-key');
        readJqlJSON('"Epic Link"=' + epicKey).then(jsonResponse => {
            if (jsonResponse && jsonResponse.issues && jsonResponse.issues.length > 0) {

                if (document.querySelector('.custom-row-labels .sprint') == null) { /* Add Header Cell for Sprint Column */
                    let rowLabels = document.querySelector('.custom-row-labels');
                    appendTH(rowLabels, 'Sprint', ['sprint']);
                }

                for(var i=0; i<jsonResponse.issues.length; i += 1) {
                    const issueJson = jsonResponse.issues[i];
                    const story = {
                                key: issueJson.key,
                                effort: issueJson.fields.customfield_10006
                            };
                    story.sprint = getSprintValue(issueJson.fields.customfield_10004);

                    var issueDom = document.querySelector('#ghx-issues-in-epic-table tr[data-issuekey="' + story.key + '"]');
                    var tdActions = issueDom.querySelector('.issue_actions');

                    var effortTD = createTD(story.effort, ['nav', 'effort']);
                    issueDom.insertBefore(effortTD, tdActions);

                    var sprintTD = createTD(story.sprint, ['nav', 'sprint']);
                    issueDom.insertBefore(sprintTD, tdActions);
                }

                sumNumericColumnFor(document.querySelector('#ghx-issues-in-epic-table'));
            }
        });
    }

    /* END REGION ENRICH EPIC PAGE */

    /* START REGION ENRICH SCRUM BOARD */

    function detectScrumBoard() {
        return document.getElementById('ghx-backlog') != null;
    }

    function enrichScrumBoard() {
        log('➡ enrichScrumBoard');

        var badges = document.querySelectorAll('.ghx-backlog-header .ghx-badge-group .aui-badge');
        if (badges && badges.length > 0) {

            if (badges[0].parentNode.querySelector('.custom-total') != null) return; //totals already added

            var sum = 0;
            for(var i=0; i < badges.length; i += 1) {
                const value = badges[i].textContent;
                if (isInteger(value)) {
                    const effortInt = parseInt(value, 10);
                    sum = sum + effortInt;
                }
            }
            var spanTotal = document.createElement('span');
            spanTotal.innerText = sum;
            spanTotal.classList.add('aui-badge', 'custom-total');
            spanTotal.style.backgroundColor = "#BFB195";
            badges[0].parentElement.appendChild(spanTotal);
        }
    }

    /* END REGION ENRICH SCRUM BOARD */

    /* REGION ENRICH Kanban BOARD */

    function detectKanbanBoard() {
        return document.getElementById('ghx-board-name') != null;
    }

    function enrichKanbanBoard() {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `.sprintCustomStyle { }`;
        document.getElementsByTagName('head')[0].appendChild(style);

        const stylesSprint = {
            width: '150px',
            height: '40px',
            backgroundColor: '#FAF0E6',
            border: '1px solid #FAF0E6',
            borderColor: '#FAF0E6',
            borderRadius: '3px',
            padding: '0px 3px'
        };

        var allSprintSpans = document.querySelectorAll('span.ghx-extra-field[data-tooltip^="Sprint:"]');
        for(var i=0;i<allSprintSpans.length;i++){
            Object.assign(allSprintSpans[i].style, stylesSprint);
        }

        const stylesLabels = {
            fontStyle: 'italic'
        }

        var allLabelsSpans = document.querySelectorAll('span.ghx-extra-field[data-tooltip^="Labels:"]');
        for(var j=0;j<allLabelsSpans.length;j++){
            Object.assign(allLabelsSpans[j].style, stylesLabels);
        }
    }

    /* END REGION ENRICH Kanban BOARD */

    /* REGION LOAD - START */

    function locationChange() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(() => {
                if (currentUrl !== document.location.href) {
                    currentUrl = document.location.href;
                    log('➡ location changed');
                    load();
                }
            });
        });
        const target = document.querySelector("body");
        const config = { childList: true, subtree: true };
        observer.observe(target, config);
    };

    function init() {

        if (CONFIG.ENRICH_FILTER_RESULTS) {
            sumNumericColumn();
        }

        if (CONFIG.ENRICH_EPIC_PAGE && detectEpicPage()) {
            enrichEpicPage();
        }

        if (CONFIG.ENRICH_SCRUM_BOARD && detectScrumBoard()) {
            enrichScrumBoard();
        }

        if (CONFIG.ENRICH_KANBAN_BOARD && detectKanbanBoard()) {
            enrichKanbanBoard();
        }

    }

    const load = () => {
        const isJiraLocation = (new RegExp(CONFIG.URL_IDENTIFIER_FOR_JIRA)).test(location.href);
        if (isJiraLocation) {
            log('➡ calling init()');

            setTimeout(init, 1000 * 1);
            setTimeout(init, 1000 * 2);
            setTimeout(init, 1000 * 3);

            var interval = setInterval(function() {
                init();
            }, CONFIG.RUN_EVERY_SECONDS * 1000);
        }
    }

    const log = (text) => {
        if (typeof window !== "undefined") {
            console.log(text);
        }
    }

    //window.onload = load;
    window.addEventListener("unload", (event) => { /*trick for back button to fire page load*/ });
    window.addEventListener('load', (event) => {
        log('➡ page is fully loaded');
        load();
    });

    locationChange();

    /* REGION LOAD - END */
}());
