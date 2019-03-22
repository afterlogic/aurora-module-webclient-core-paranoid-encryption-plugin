'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function CDecryptKeyPasswordPopup()
{
	CAbstractPopup.call(this);

	this.keyPassword = ko.observable('');
	this.fOnPasswordEnterCallback = null;
	this.fOnCancellCallback = null;
}

_.extendOwn(CDecryptKeyPasswordPopup.prototype, CAbstractPopup.prototype);

CDecryptKeyPasswordPopup.prototype.PopupTemplate = '%ModuleName%_DecryptKeyPasswordPopup';

CDecryptKeyPasswordPopup.prototype.onOpen = function (fOnPasswordEnterCallback, fOnCancellCallback)
{
	this.fOnPasswordEnterCallback = fOnPasswordEnterCallback;
	this.fOnCancellCallback = fOnCancellCallback;
};

CDecryptKeyPasswordPopup.prototype.decryptKey = function ()
{
	if (_.isFunction(this.fOnPasswordEnterCallback))
	{
		this.fOnPasswordEnterCallback(this.keyPassword());
	}
	this.closePopup();
};

CDecryptKeyPasswordPopup.prototype.cancelPopup = function ()
{
	if (_.isFunction(this.fOnCancellCallback))
	{
		this.fOnCancellCallback();
	}
	this.closePopup();
};

CDecryptKeyPasswordPopup.prototype.onShow = function ()
{
	this.keyPassword('');
};

module.exports = new CDecryptKeyPasswordPopup();
