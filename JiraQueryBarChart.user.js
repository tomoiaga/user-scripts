// ==UserScript==
// @name         JiraQueryBarChart
// @namespace    http://tomoiaga.ro
// @version      2022.11
// @description  Jira Query Bar Chart
// @author       Vasile Tomoiaga
// @match        *://*/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @icon         https://www.google.com/s2/favicons?domain=https://www.tampermonkey.net/
// @grant        none
// ==/UserScript==

'use strict';

let currentUrl = document.location.href;

const CONFIG = {
    URL_IDENTIFIER_FOR_JIRA: 'jira',

    EFFORT_COLUMN : 'customfield_10006',  /* The script will detect the Story Points column, and if not found, will use this value. */

    EFFORT_CATEGORIES: [
        {
            Name: "New",
            Statuses: ["New", "Refined"],
            Total: 0,
            Color: '#FEC009' /*'#FFE4B5'*/
        },
        {
            Name: "In Progress",
            Statuses: ["In Progress", "Commited", "Define", "Build", "In Review", "Testing"],
            Total: 0,
            Color: "#43BCD9", /*"#00BFFF"*/
        },
        {
            Name: "Done",
            Statuses: ["Done", "Released", "Closed", "Resolved"],
            Total: 0,
            Color: "#819E87" /*"#8FBC8F"*/
        }
    ]
};

this.$ = this.jQuery = jQuery.noConflict(true);

function detectEffortColumnIndex(resultsTable) {
    var _headerCells = resultsTable.getElementsByTagName("th");

    for (let i = 0; i < _headerCells.length; i++) {
        let _th = _headerCells[i];
        let _x = _th.innerText;
        let _cellText = _th.innerText.trim().toUpperCase();

        if ((_cellText.includes("STORY") && _cellText.includes("POINTS")) ||
           (_cellText.includes("EFFORT") && _cellText.includes("POINTS")))
        {
            return i;
        }
    }

    return -1;
}

function computeDataSummary() {
    log('➡ computeDataSummary');

    CONFIG.EFFORT_CATEGORIES.forEach(category => { category.Total = 0 });

    var _effortColumn = detectEffortColumnIndex($('#issuetable')[0]);

    $('#issuetable tr').each(function() {
        var _row = $(this);
        var _storyPointsText = _row.find('.' + CONFIG.EFFORT_COLUMN).text();
        const _storyPoints = parseInt(_storyPointsText, 10);
        if (isInteger(_storyPoints)){
            var _status = _row.find('td.status').text().trim();

            let _category = CONFIG.EFFORT_CATEGORIES.find(
                o => o.Statuses.find(s => s.toUpperCase() === _status.toUpperCase())
            );

            if (_category) {
                _category.Total = _category.Total + _storyPoints;
            }
        }
    });
}

function initCanvas() {
    var _canvas = document.getElementById("myCanvas");
    _canvas.width = 1000;
    _canvas.height = 80;

    var _context = _canvas.getContext("2d");
    _context.clearRect(0, 0, _canvas.width, _canvas.height);

    return _canvas;
}


function showChart() {
    log('➡ showChart');

    if ($('#barchart-container').length == 0) {
        var _chart = $( "div.issue-search-header" ).after('<div id="barchart-container" style="padding: 10px 10px"><h2>Progress Chart <span id="refreshChart" style="cursor:pointer">⟳</span></h2><canvas id="myCanvas" style="border:1px solid #d3d3d3; margin-top:10px;"></div>');
        $('#refreshChart').click(function() {
            computeDataSummary();
            showChart();
        });
    }

    var _totalEffort = CONFIG.EFFORT_CATEGORIES.reduce((partialSum, c) => partialSum + c.Total, 0);

    var _canvas = initCanvas();
    var _context = _canvas.getContext("2d");

    const CHART_TOP_MARGIN = 2;
    const CHART_LEFT_MARGIN = 2;

    const CHART_WIDTH = _canvas.width - CHART_LEFT_MARGIN - CHART_LEFT_MARGIN;

    const _chartPanelHeight = _canvas.height - CHART_TOP_MARGIN - CHART_TOP_MARGIN;
    
    var _horizontalStart = CHART_LEFT_MARGIN;

    CONFIG.EFFORT_CATEGORIES.forEach(category => {
        let _width = (category.Total / _totalEffort) * CHART_WIDTH;
        if (_width > 0) { /* do not draw areas with 0 width */
            _context.fillStyle = category.Color;
            _context.fillRect(_horizontalStart, CHART_TOP_MARGIN, _width, _chartPanelHeight);

            _context.fillStyle = "black";
            _context.font = "bold 13px Calibri";
            _context.textAlign = "left";
            _context.fillText(category.Name, _horizontalStart + 5, CHART_TOP_MARGIN + _chartPanelHeight/4);

            _context.font = "normal 13px Calibri";
            _context.fillText('' + Math.round((category.Total / _totalEffort) * 100) + '%', _horizontalStart + 5, CHART_TOP_MARGIN + _chartPanelHeight/2);

            _context.fillText('' + category.Total + ' sp (' + _totalEffort + ')', _horizontalStart + 5, CHART_TOP_MARGIN + _chartPanelHeight - 5);

            _horizontalStart += _width;
        }
    });
}

// ➡ REGION COMMON FUNCTIONS //

function isInteger(value) {
    return /^\d+$/.test(value);
}

const log = (text) => {
    if (typeof window !== "undefined") {
        console.log(text);
    }
}

// ⬅ REGION COMMON FUNCTIONS //

// ⬅➡ //

// ➡ REGION LOAD //

const load = () => {
    log('➡ load');
    computeDataSummary();
    showChart();
}

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

// ⬅ REGION LOAD //

$(function() {
    locationChange();
    load();
});
