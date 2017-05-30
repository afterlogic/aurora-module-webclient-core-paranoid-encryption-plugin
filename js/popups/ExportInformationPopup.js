'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js')
;

/**
 * @constructor
 */
function CExportInformationPopup()
{
	CAbstractPopup.call(this);
	
	this.downloadLink= ko.observable('#');
}

_.extendOwn(CExportInformationPopup.prototype, CAbstractPopup.prototype);

CExportInformationPopup.prototype.PopupTemplate = '%ModuleName%_ExportInformationPopup';

CExportInformationPopup.prototype.onShow = function (sDownloadLink)
{
	this.downloadLink(sDownloadLink);
};

module.exports = new CExportInformationPopup();
