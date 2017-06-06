'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function CExportInformationPopup()
{
	CAbstractPopup.call(this);
	
	this.downloadLink = ko.observable('#');
	this.keyName = ko.observable('');
}

_.extendOwn(CExportInformationPopup.prototype, CAbstractPopup.prototype);

CExportInformationPopup.prototype.PopupTemplate = '%ModuleName%_ExportInformationPopup';

CExportInformationPopup.prototype.onShow = function (sDownloadLink, sKeyName)
{
	this.downloadLink(sDownloadLink);
	this.keyName(sKeyName);
};

module.exports = new CExportInformationPopup();
