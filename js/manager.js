'use strict';

var
	_ = require('underscore'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),
	
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	Browser = require('%PathToCoreWebclientModule%/js/Browser.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	ConfirmPopup = require('%PathToCoreWebclientModule%/js/popups/ConfirmPopup.js'),
	
	ConfirmEncryptionPopup = require('modules/%ModuleName%/js/popups/ConfirmEncryptionPopup.js'),
	ConfirmUploadPopup = require('modules/%ModuleName%/js/popups/ConfirmUploadPopup.js'),
	InitializationVectorPopup = require('modules/%ModuleName%/js/popups/InitializationVectorPopup.js'),
	
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	
	Crypto = null,
	OpenPgpEncryptor = null,
	AwaitConfirmationQueue = [],	//List of files waiting for the user to decide on encryption
	isConfirmPopupShown = false,
	FilesView = null
;

function IsHttpsEnable()
{
	return window.location.protocol === "https:";
}

function ShowUploadPopup(sUid, oFileInfo, fUpload, fCancel, sErrorText)
{
	if (isConfirmPopupShown)
	{
		AwaitConfirmationQueue.push({
			sUid: sUid,
			oFileInfo: oFileInfo
		});
	}
	else
	{
		setTimeout(function () {
			Popups.showPopup(ConfirmUploadPopup, [
				fUpload,
				fCancel,
				AwaitConfirmationQueue.length,
				_.map(AwaitConfirmationQueue, function(element) {
					return element.oFileInfo.FileName;
				}),
				sErrorText
			]);
		}, 10);
		isConfirmPopupShown = true;
		AwaitConfirmationQueue.push({
			sUid: sUid,
			oFileInfo: oFileInfo
		});
	}
}

function StartModule (ModulesManager)
{
	ModulesManager.run('SettingsWebclient', 'registerSettingsTab', [
		function () { return require('modules/%ModuleName%/js/views/ParanoidEncryptionSettingsFormView.js'); },
		Settings.HashModuleName,
		TextUtils.i18n('%MODULENAME%/LABEL_SETTINGS_TAB')
	]);
	
	App.subscribeEvent('AbstractFileModel::FileDownload::before', function (oParams) {
		if (!oParams.File || !oParams.File.IS_FILE) {
			// it might be attachment, Paranoid doesn't work with them
			return;
		}

		var
			oFile = oParams.File,
			oExtendedProps = oFile?.oExtendedProps || false,
			iv = oExtendedProps?.InitializationVector || false,
			sParanoidEncryptedKey = oExtendedProps?.ParanoidKey || false,
			sParanoidEncryptedKeyShared = oExtendedProps?.ParanoidKeyShared || false,
			bIsOwnFile = oFile.sOwnerName === App.getUserPublicId(),
			bSharedWithMe = oFile.sharedWithMe()
		;
		//User can decrypt only own or shared files
		if (!Settings.enableJscrypto() || !iv
			|| !(bIsOwnFile || bSharedWithMe))
		{
			//regular upload will start in Jua in this case
		}
		else if (!IsHttpsEnable())
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
			oParams.CancelDownload = true;
		}
		else
		{
			oParams.CustomDownloadHandler = function () {
				Crypto.downloadDividedFile(
					oFile,
					iv,
					null,
					null,
					bSharedWithMe && sParanoidEncryptedKeyShared
						? sParanoidEncryptedKeyShared
						: sParanoidEncryptedKey
				);
			};
		}
	});

	App.subscribeEvent('Jua::FileUpload::before', function (oParams) {
		var
			sUid = oParams.sUid,
			sModuleName = oParams.sModuleName,
			oFileInfo = oParams.oFileInfo,
			fOnChunkEncryptCallback = oParams.fOnChunkReadyCallback,
			fRegularUploadFileCallback = oParams.fRegularUploadFileCallback,
			fCancelFunction = oParams.fCancelFunction,
			fStartUploadCallback = function (oFileInfo, sUid, fOnChunkEncryptCallback) {
				if (!Settings.AllowMultiChunkUpload && oFileInfo.File.size > Crypto.iChunkSize)
				{
					Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_FILE_SIZE_LIMIT', {'VALUE': Settings.ChunkSizeMb}));
					fCancelFunction(sUid);
					Crypto.oChunkQueue.isProcessed = false;
					Crypto.checkQueue();
				}
				else
				{
					// Starts upload an encrypted file
					Crypto.startUpload(
						oFileInfo,
						sUid,
						fOnChunkEncryptCallback,
						_.bind(function () {
							fCancelFunction(sUid);
							Crypto.oChunkQueue.isProcessed = false;
							Crypto.checkQueue();
						}, this)
					);
				}
			},
			fUpload = _.bind(function () {
				AwaitConfirmationQueue.forEach(function (element) {
					fRegularUploadFileCallback(element.sUid, element.oFileInfo);
				});
				AwaitConfirmationQueue = [];
				isConfirmPopupShown = false;
			}, this),
			fEncrypt = _.bind(function () {
				AwaitConfirmationQueue.forEach(function (element) {
					// if another file is being uploaded now - add a file to the queue
					Crypto.oChunkQueue.aFiles.push({
						fStartUploadCallback: fStartUploadCallback,
						oFileInfo: element.oFileInfo,
						sUid: element.sUid,
						fOnChunkEncryptCallback: fOnChunkEncryptCallback
					});
				});
				AwaitConfirmationQueue = [];
				isConfirmPopupShown = false;
				if (!Crypto.oChunkQueue.isProcessed)
				{
					Crypto.oChunkQueue.isProcessed = true;
					Crypto.checkQueue();
				}
			}),
			fCancel = _.bind(function () {
				AwaitConfirmationQueue.forEach(function (element) {
					fCancelFunction(element.sUid);
				});
				AwaitConfirmationQueue = [];
				isConfirmPopupShown = false;
			})
		;

		if (Settings.enableJscrypto() &&
			Settings.EncryptionAllowedModules &&
			Settings.EncryptionAllowedModules.length > 0 &&
			Settings.EncryptionAllowedModules.includes(sModuleName) &&
			(
				oParams.sStorageType === 'encrypted' ||
				oParams.sStorageType === 'personal' && Settings.EnableInPersonalStorage
			)
		)
		{
			if (!IsHttpsEnable())
			{
				if (oParams.sStorageType === 'personal' && Settings.EnableInPersonalStorage)
				{
					//for AskMe encryption mode show dialog with warning and regular upload button
					ShowUploadPopup(sUid, oFileInfo, fUpload, fCancel, TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
				}
				else
				{
					//for Always encryption mode show error
					Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_HTTPS_NEEDED'));
					fCancelFunction(sUid);
				}
			}
			else if (oParams.sStorageType === 'personal' && Settings.EnableInPersonalStorage)
			{
				if (isConfirmPopupShown)
				{
					AwaitConfirmationQueue.push({
						sUid: sUid,
						oFileInfo: oFileInfo
					});
				}
				else
				{
					setTimeout(function () {
						Popups.showPopup(ConfirmEncryptionPopup, [
							fEncrypt,
							fUpload,
							fCancel,
							AwaitConfirmationQueue.length,
							_.map(AwaitConfirmationQueue, function(element) {
								return element.oFileInfo.FileName;
							})
						]);
					}, 10);
					isConfirmPopupShown = true;
					AwaitConfirmationQueue.push({
						sUid: sUid,
						oFileInfo: oFileInfo
					});
				}
			}
			else
			{
				if (Crypto.oChunkQueue.isProcessed === true)
				{ // if another file is being uploaded now - add a file to the queue
					Crypto.oChunkQueue.aFiles.push({
						fStartUploadCallback: fStartUploadCallback,
						oFileInfo: oFileInfo,
						sUid: sUid,
						fOnChunkEncryptCallback: fOnChunkEncryptCallback
					});
				}
				else
				{ // If the queue is not busy - start uploading
					fStartUploadCallback(oFileInfo, sUid, fOnChunkEncryptCallback);
				}
			}
		}
		else
		{
			fRegularUploadFileCallback(sUid, oFileInfo);
		}
	});

	App.subscribeEvent('CFilesView::FileDownloadCancel', function (oParams) {
		if (Settings.enableJscrypto() && IsHttpsEnable())
		{
			oParams.oFile.stopDownloading();
		}
	});

	App.subscribeEvent('CFilesView::FileUploadCancel', function (oParams) {
		if (Settings.enableJscrypto() && IsHttpsEnable())
		{
			//clear queue
			Crypto.oChunkQueue.aFiles.forEach(function (oData, index, array) {
					oParams.fOnUploadCancelCallback(oData.sUid, oData.oFileInfo.FileName);
			});
			Crypto.oChunkQueue.aFiles = [];

			Crypto.stopUploading(oParams.sFileUploadUid , oParams.fOnUploadCancelCallback, oParams.sFileUploadName);
		}
		else if (_.isFunction(oParams.fOnUploadCancelCallback))
		{
			oParams.fOnUploadCancelCallback(oParams.sFileUploadUid, oParams.sFileUploadName);
		}
	});
	App.subscribeEvent('Jua::FileUploadingError', function () {
		if (Settings.enableJscrypto() && IsHttpsEnable())
		{
			Crypto.oChunkQueue.isProcessed = false;
			Crypto.checkQueue();
		}
	});
	App.subscribeEvent('FilesWebclient::ParseFile::after', function (aParams) {
		let
			oFile = aParams[0],
			oExtendedProps = oFile?.oExtendedProps || false,
			iv = oExtendedProps?.InitializationVector || false,
			bIsEncrypted = !!iv,
			sParanoidEncryptedKey = oExtendedProps?.ParanoidKey || false,
			sParanoidEncryptedKeyShared = oExtendedProps?.ParanoidKeyShared || false,
			bIsImage = (/\.(png|jpe?g|gif)$/).test(oFile.fileName().toLowerCase()),
			bIsOwnFile = oFile.sOwnerName === App.getUserPublicId(),
			bSharedWithMe = oFile.sharedWithMe()
		;

		if (bIsEncrypted)
		{
			oFile.thumbnailSrc('');
			if (
				(bIsOwnFile || bSharedWithMe)
				&& bIsImage
				&& Settings.enableJscrypto()
			)
			{// change view action for images
				oFile.oActionsData.view.Handler = () => {
					Crypto.viewEncryptedImage(
						oFile,
						iv,
						bSharedWithMe && sParanoidEncryptedKeyShared
							? sParanoidEncryptedKeyShared
							: sParanoidEncryptedKey
					);
				};
			}
			else
			{// remove view action for non-images
				oFile.removeAction('view');
			}
			oFile.removeAction('list');
			oFile.bIsSecure(true);
			oFile.onSecureIconClick = (oItem) => {
				Popups.showPopup(InitializationVectorPopup, [oFile, iv]);
			};
		}
	});
	App.subscribeEvent('FileViewerWebclientPlugin::FilesCollection::after', function (oParams) {
		oParams.aFilesCollection(_.filter(oParams.aFilesCollection(), function (oArg) {
			return !(typeof(oArg.oExtendedProps) !== 'undefined' &&  typeof(oArg.oExtendedProps.InitializationVector) !== 'undefined');
		}));
	});

	Settings.enableJscrypto.subscribe(function(newValue) {
		if (FilesView !== null)
		{
			FilesView.requestStorages();
		}
	});

	App.subscribeEvent('FilesWebclient::ConstructView::after', function (oParams) {
		if ('CFilesView' === oParams.Name)
		{
			FilesView = oParams.View;
			var ComposeMessageWithAttachments = ModulesManager.run('MailWebclient', 'getComposeMessageWithAttachments');
			if (_.isFunction(ComposeMessageWithAttachments))
			{
				FilesView.executeSend = function ()
				{
					var
						aItems = this.selector.listCheckedAndSelected(),
						aFileItems = _.filter(aItems, function (oItem) {
							return oItem && oItem.IS_FILE;
						}, this),
						bHasEncrypted = false,
						aFilesData = _.map(aFileItems, function (oItem) {
							var bItemEncrypted = !!(oItem.oExtendedProps && oItem.oExtendedProps.InitializationVector)
							bHasEncrypted = bHasEncrypted || bItemEncrypted;
							return {
								'Storage': oItem.storageType(),
								'Path': oItem.path(),
								'Name': oItem.fileName(),
								'Id': oItem.id(),
								'IsEncrypted': bItemEncrypted
							};
						})
					;

					if (this.bAllowSendEmails && aFileItems.length > 0)
					{
						if (bHasEncrypted)
						{
							Popups.showPopup(ConfirmPopup, [TextUtils.i18n('%MODULENAME%/ALERT_SEND_ENCRYPTED_FILES'), function (bSendAnyway) {
								if (bSendAnyway)
								{
									Ajax.send('Files', 'SaveFilesAsTempFiles', { 'Files': aFilesData }, function (oResponse) {
										if (oResponse.Result)
										{
											ComposeMessageWithAttachments(oResponse.Result);
										}
									}, this);
								}
							}.bind(this)]);
						}
						else
						{
							Ajax.send('Files', 'SaveFilesAsTempFiles', { 'Files': aFilesData }, function (oResponse) {
								if (oResponse.Result)
								{
									ComposeMessageWithAttachments(oResponse.Result);
								}
							}, this);
						}
					}
				};
				FilesView.sendCommand = Utils.createCommand(FilesView, FilesView.executeSend, function () {
					if (!this.isZipFolder() && this.allSelectedFilesReady())
					{
						var
							aItems = this.selector.listCheckedAndSelected(),
							aFileItems = _.filter(aItems, function (oItem) {
								return oItem && oItem.IS_FILE;
							}, this)
						;
						return (aFileItems.length > 0);
					}
					return false;
				});
			}
		}
	});

	const PrepareShares = require('modules/%ModuleName%/js/utils/PrepareShares.js');
	App.subscribeEvent('SharedFiles::UpdateShare::before', PrepareShares.onBeforeUpdateShare);

	App.subscribeEvent('SharedFiles::OpenFilesSharePopup', oParams => {
		if (oParams.IsDir)
		{
			oParams.DialogHintText(TextUtils.i18n('%MODULENAME%/INFO_SHARING_FOLDER'));
		}
	});
}

module.exports = function (oAppData) {
	Settings.init(oAppData);

	return {
		/**
		 * Runs before application start. Subscribes to the event before post displaying.
		 *
		 * @param {Object} ModulesManager
		 */
		start: function (ModulesManager) {
			Crypto = require('modules/%ModuleName%/js/CCrypto.js');
			OpenPgpEncryptor = ModulesManager.run('OpenPgpWebclient', 'getOpenPgpEncryptor');

			var bBlobSavingEnable = window.Blob && window.URL && _.isFunction(window.URL.createObjectURL);
			// Module can't work without saving blob and shouldn't be initialized.
			if (bBlobSavingEnable)
			{
				if (Browser.chrome && !IsHttpsEnable())
				{
					// Module can't work without https.0
					// Module should be initialized to display message about https enabling.
					StartModule(ModulesManager);
				}
				else if (window.crypto && window.crypto.subtle)
				{
					if (!Browser.edge)
					{
						StartModule(ModulesManager);

					}
					// var sPassword = window.crypto.getRandomValues(new Uint8Array(16));
					// // window.crypto can't work with PBKDF2 in Edge.
					// // Checks if it works (in case if it will work in Edge one day) and then inizializes module.
					// window.crypto.subtle.importKey('raw', sPassword, {name: 'PBKDF2'}, false, ['deriveBits', 'deriveKey'])
					// 	.then(function () {
					// 		StartModule(ModulesManager);
					// 	});
				}
			}
		}
	};
};
