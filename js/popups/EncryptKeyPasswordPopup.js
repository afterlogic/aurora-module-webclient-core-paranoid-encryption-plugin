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
function CEncryptKeyPasswordPopup()
{
	CAbstractPopup.call(this);

	this.keyPassword = ko.observable('');
	this.keyPasswordConfirm = ko.observable('');
	this.fOnPasswordEnterCallback = null;
	this.fOnWrongPasswordCallback = null;
	this.fOnCancellCallback = null;
}

_.extendOwn(CEncryptKeyPasswordPopup.prototype, CAbstractPopup.prototype);

CEncryptKeyPasswordPopup.prototype.PopupTemplate = '%ModuleName%_EncryptKeyPasswordPopup';

CEncryptKeyPasswordPopup.prototype.onOpen = function (fOnPasswordEnterCallback, fOnCancellCallback)
{
	this.fOnPasswordEnterCallback = fOnPasswordEnterCallback;
	this.fOnCancellCallback = fOnCancellCallback;
};

CEncryptKeyPasswordPopup.prototype.encryptKey = function ()
{
	if ($.trim(this.keyPassword()) === '')
	{
		this.showError(TextUtils.i18n('%MODULENAME%/ERROR_PASSWORD_CANT_BE_BLANK'));
	}
	else if ($.trim(this.keyPassword()) !== $.trim(this.keyPasswordConfirm()))
	{
		this.showError(TextUtils.i18n('COREWEBCLIENT/ERROR_PASSWORDS_DO_NOT_MATCH'));
	}
	else
	{
		if (_.isFunction(this.fOnPasswordEnterCallback))
		{
			this.fOnPasswordEnterCallback($.trim(this.keyPassword()));
		}
		this.closePopup();
	}
};

CEncryptKeyPasswordPopup.prototype.cancelPopup = function ()
{
	if (_.isFunction(this.fOnCancellCallback))
	{
		this.fOnCancellCallback();
	}
	this.closePopup();
};

CEncryptKeyPasswordPopup.prototype.onShow = function ()
{
	this.keyPassword('');
	this.keyPasswordConfirm('');
};

CEncryptKeyPasswordPopup.prototype.showError = function (sMessage)
{
	Screens.showError(sMessage);
};

module.exports = new CEncryptKeyPasswordPopup();
