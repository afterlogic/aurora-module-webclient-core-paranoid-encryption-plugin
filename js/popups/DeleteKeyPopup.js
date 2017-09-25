'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	ConfirmPopup = require('%PathToCoreWebclientModule%/js/popups/ConfirmPopup.js')
;

/**
 * @constructor
 */
function CExportInformationPopup()
{
	CAbstractPopup.call(this);
	
	this.downloadLink = ko.observable('');
	this.keyName = ko.observable('');
	this.fDelete = null;
	this.fDeleteCallback = null;
}

_.extendOwn(CExportInformationPopup.prototype, CAbstractPopup.prototype);

CExportInformationPopup.prototype.PopupTemplate = '%ModuleName%_DeleteKeyPopup';

CExportInformationPopup.prototype.onOpen = function (sDownloadLink, sKeyName, fDelete)
{
	this.downloadLink(sDownloadLink);
	this.keyName(sKeyName);
	this.fDeleteCallback = _.bind(function (bRemove) {
		fDelete.call(this, bRemove);
		
		if (bRemove)
		{
			this.closePopup();
		}
		else
		{
			this.showPopup();
		}
	}, this);
};

CExportInformationPopup.prototype.deleteKey = function ()
{
	this.hidePopup();
	Popups.showPopup(ConfirmPopup, [TextUtils.i18n('%MODULENAME%/CONFIRM_DELETE_KEY'), this.fDeleteCallback]);
};

module.exports = new CExportInformationPopup();
