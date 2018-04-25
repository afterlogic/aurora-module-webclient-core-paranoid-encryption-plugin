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
function CDeleteKeyPopup()
{
	CAbstractPopup.call(this);
	
	this.fExportKeyCallback = null;
	this.keyName = ko.observable('');
	this.fDelete = null;
	this.fDeleteCallback = null;
}

_.extendOwn(CDeleteKeyPopup.prototype, CAbstractPopup.prototype);

CDeleteKeyPopup.prototype.PopupTemplate = '%ModuleName%_DeleteKeyPopup';

CDeleteKeyPopup.prototype.onOpen = function (fExportKeyCallback, sKeyName, fDelete)
{
	if (_.isFunction(fExportKeyCallback))
	{
		this.fExportKeyCallback = _.bind(function() {
			this.closePopup();
			fExportKeyCallback();
		}, this);
	}
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

CDeleteKeyPopup.prototype.deleteKey = function ()
{
	this.hidePopup();
	Popups.showPopup(ConfirmPopup, [TextUtils.i18n('%MODULENAME%/CONFIRM_DELETE_KEY'), this.fDeleteCallback]);
};

module.exports = new CDeleteKeyPopup();
