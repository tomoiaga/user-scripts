// ==UserScript==
// @name         Jira Query Bar Chart
// @namespace    http://tomoiaga.ro
// @version      0.1
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

    STATUS_COLUMN : 'customfield_10006',

    EFFORT_CATEGORIES: [
        {
            Name: "New",
            Statuses: ["New", "Refined"],
            Total: 0,
            Color: '#FFE4B5'
        },
        {
            Name: "In Progress",
            Statuses: ["In Progress", "Commited", "Define", "Build", "In Review", "Testing"],
            Total: 0,
            Color: "#1E90FF"
        },
        {
            Name: "Done",
            Statuses: ["Done", "Released", "Closed", "Resolved"],
            Total: 0,
            Color: "#228B22"
        }
    ]
};

this.$ = this.jQuery = jQuery.noConflict(true);

function computeDataSummary() {
    log('➡ computeDataSummary');

    $('#issuetable tr').each(function() {
        var _row = $(this);
        var _storyPointsText = _row.find('.' + CONFIG.STATUS_COLUMN).text();
        const _storyPoints = parseInt(_storyPointsText, 10);
        if (isInteger(_storyPoints)){
            var _status = _row.find('td.status').text().trim();

            let _category = CONFIG.EFFORT_CATEGORIES.find(
                o => o.Statuses.find(s => s.toUpperCase() === _status.toUpperCase())
            );

            if (_category) {
                _category.Total = _category.Total + _storyPoints;
            }

            console.log(_status + ' ' + _storyPoints + ' ' + _category);
        }
    });
}

function showChart() {
    log('➡ showChart');

    if ($('#barchart-container').length == 0) {
        var _chart = $( "div.issue-search-header" ).after('<div id="barchart-container"><h2>Progress Chart</h2><canvas id="myCanvas" width="1050" height="100" style="border:1px solid #d3d3d3;"></div>');
        $('#barchart-container').css('padding', '20');
    }

    var _totalEffort = CONFIG.EFFORT_CATEGORIES.reduce((partialSum, c) => partialSum + c.Total, 0);

    var c = document.getElementById("myCanvas");
    var ctx = c.getContext("2d");

    ctx.clearRect(0, 0, c.width, c.height);

    const CHART_WIDTH = 1000;
    const _top = 20;
    const _height = 60;
    var _x = 20;

    CONFIG.EFFORT_CATEGORIES.forEach(category => {
        let _width = (category.Total / _totalEffort) * CHART_WIDTH;
        ctx.fillStyle = category.Color;
        ctx.fillRect(_x, _top, _width, _height);

        ctx.fillStyle = "black";
        ctx.font = "bold 12px Calibri";
        ctx.textAlign = "left";
        ctx.fillText(category.Name, _x + 5, _top + _height/4);

        ctx.font = "normal 12px Calibri";
        ctx.fillText('' + Math.round((category.Total / _totalEffort) * 100) + '%', _x + 5, _top + _height/2);

        ctx.fillText('' + category.Total + ' sp', _x + 5, _top + _height - 5);

        _x += _width;
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
