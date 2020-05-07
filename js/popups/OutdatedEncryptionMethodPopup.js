'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function OutdatedEncryptionMethodPopup()
{
	CAbstractPopup.call(this);
	this.message = ko.observable('');
	this.dontRemindMe = ko.observable(false);
	this.fContinueCallback = null;
	this.fCancelCallback = null;
}

_.extendOwn(OutdatedEncryptionMethodPopup.prototype, CAbstractPopup.prototype);

OutdatedEncryptionMethodPopup.prototype.PopupTemplate = '%ModuleName%_OutdatedEncryptionMethodPopup';

OutdatedEncryptionMethodPopup.prototype.onOpen = function (sFileName, fContinueCallback, fCancelCallback)
{
	this.message(TextUtils.i18n('%MODULENAME%/MESSAGE_OUTDATED_ENCRYPTION_METHOD', {'FILENAME': sFileName}));
	this.fContinueCallback = fContinueCallback;
	this.fCancelCallback = fCancelCallback;
};

OutdatedEncryptionMethodPopup.prototype.cancel = function ()
{
	this.fCancelCallback();
	this.closePopup();
};

OutdatedEncryptionMethodPopup.prototype.continueDownload = function ()
{
	if (this.dontRemindMe())
	{
		Ajax.send('%ModuleName%',
			'DontRemindMe',
			{},
			oResponse => {
				if (oResponse.Result === true)
				{
					Settings.DontRemindMe(true);
				}
			},
			this
		);
	}
	this.fContinueCallback();
	this.closePopup();
};

module.exports = new OutdatedEncryptionMethodPopup();
