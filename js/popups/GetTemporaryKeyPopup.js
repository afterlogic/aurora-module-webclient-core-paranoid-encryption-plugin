'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js')
;

/**
 * @constructor
 */
function GetTemporaryKeyPopup()
{
	CAbstractPopup.call(this);

	this.key = ko.observable('');
	this.fOnKeyEnterCallback = null;
	this.fOnCancellCallback = null;
}

_.extendOwn(GetTemporaryKeyPopup.prototype, CAbstractPopup.prototype);

GetTemporaryKeyPopup.prototype.PopupTemplate = '%ModuleName%_GetTemporaryKeyPopup';

GetTemporaryKeyPopup.prototype.onOpen = function (fOnKeyEnterCallback, fOnCancellCallback)
{
	this.key('');
	this.fOnKeyEnterCallback = fOnKeyEnterCallback;
	this.fOnCancellCallback = fOnCancellCallback;
};

GetTemporaryKeyPopup.prototype.cancel = function ()
{
	this.fOnCancellCallback();
	this.closePopup();
};

GetTemporaryKeyPopup.prototype.enterKey = function ()
{
	if (this.key() === '')
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_KEY_CANT_BE_BLANK'));
	}
	else
	{
		this.fOnKeyEnterCallback(this.key());
		this.closePopup();
	}
};

module.exports = new GetTemporaryKeyPopup();
