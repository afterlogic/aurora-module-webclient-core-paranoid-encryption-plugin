'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function CExportInformationPopup()
{
	CAbstractPopup.call(this);
	
	this.fExportKeyCallback = null;
	this.keyName = ko.observable('');
}

_.extendOwn(CExportInformationPopup.prototype, CAbstractPopup.prototype);

CExportInformationPopup.prototype.PopupTemplate = '%ModuleName%_ExportInformationPopup';

CExportInformationPopup.prototype.onOpen = function (fExportKeyCallback, sKeyName)
{
	if (_.isFunction(fExportKeyCallback))
	{
		this.fExportKeyCallback = _.bind(function() {
			this.closePopup();
			fExportKeyCallback();
		}, this);
	}
	this.keyName(sKeyName);
};

module.exports = new CExportInformationPopup();
