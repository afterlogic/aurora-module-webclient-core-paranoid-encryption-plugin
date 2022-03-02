import eventBus from 'src/event-bus'
import notification from "../../../CoreMobileWebclient/vue-mobile/src/utils/notification";
import { getCoreParanoidEncryptionSettings } from "../settings";
import { askOpenPgpKeyPassword } from "../../../OpenPgpMobileWebclient/vue-mobile/utils";
import { parseUploadedFile } from "../../../FilesMobileWebclient/vue-mobile/utils/common";
import OpenPgp from "../../../OpenPgpMobileWebclient/vue-mobile/openpgp-helper";
import { getNewUid } from "./utils";
import store from "src/store";

import Crypto from "../crypto/CCrypto";

let fileIndex = 0
let data = null

const finishUploadingFiles = async () => {
    fileIndex = 0
    await store.dispatch('filesmobile/asyncGetFiles')
    await store.dispatch('filesmobile/removeUploadedFiles')
}

const cryptoUpload = async (params) => {
    const currentAccountEmail = store.getters['core/userPublicId']
    const privateKey = OpenPgp.getPrivateKeyByEmail(currentAccountEmail)
    const publicKey = OpenPgp.getPublicKeyByEmail(currentAccountEmail)
    if (privateKey && publicKey) {
        await Crypto.startUpload(
            params.fileInfo,
            params.uid,
            null,
            finishUploadingFiles,
            privateKey,
            publicKey,
            currentAccountEmail,
            askOpenPgpKeyPassword,
            params.callBack,
            params.fileIndexUp,
            data.getParentComponent
        )
    } else {
        this.downloadFiles = []
        //notification.showError(`PGP key for ${currentAccountEmail} user is missing. Both public and private PGP keys are required.`)
    }
}

const uploadEncryptFiles = async () => {
    const downloadFiles = store.getters['filesmobile/downloadFiles']
    const currentPath = store.getters['filesmobile/currentPath']
    const currentStorage = store.getters['filesmobile/currentStorage']
    if (fileIndex > downloadFiles.length - 1) {
        store.dispatch('filesmobile/removeUploadedFiles')
        store.dispatch('filesmobile/asyncGetFiles')
        fileIndex = 0
    } else {
        const fileInfo = {
            file: downloadFiles[fileIndex],
            localFile: downloadFiles[fileIndex].file,
            //fileClass: downloadFiles[fileIndex],
            fileName: downloadFiles[fileIndex].name,
            folder: currentPath,
            size: downloadFiles[fileIndex].size,
            type: ''
        }
        fileIndex++
        await cryptoUpload({
            uid: getNewUid(),
            fileInfo: fileInfo,
            storageType: currentStorage.Type,
            callBack: uploadEncryptFiles,
            fileIndexUp: (index) => {
                fileIndex = index
            }
        })
    }
}

const onFileAdded = async (files, uploader) => {
    const currentPath = store.getters['filesmobile/currentPath']
    const currentStorage = store.getters['filesmobile/currentStorage']
    const parsedFiles = files.map((file) => {
        return parseUploadedFile(
            file,
            currentPath,
            currentStorage.Type
        )
    })
    await store.dispatch('filesmobile/addDownloadsFiles', parsedFiles)
    await uploadEncryptFiles()
}

const onSetUploadMethods = (methods) => {
    eventBus.$emit('onUploadFiles', {
        factory: null,
        added: onFileAdded,
        uploaded: null,
        finish: methods.finish,
    })
}

export const onContinueUploadingFiles = (params) => {
    const settings = getCoreParanoidEncryptionSettings()
    data = params
    if (settings.enableInPersonalStorage && settings.enableParanoidEncryption && params.storage === 'personal') {
        console.log('fileUploadTypeSelectionDialog')
    } else {
        if (params.storage === 'encrypted') {
            onSetUploadMethods(params.methods)
        } else {
            eventBus.$emit('onUploadFiles', params.methods)
        }
    }
}


const getAesKey = async (file, getParentComponent) => {
    const currentAccountEmail = store.getters['core/userPublicId']
    const privateKey = OpenPgp.getPrivateKeyByEmail(currentAccountEmail)
    let oPublicFromKey = OpenPgp.getPublicKeyByEmail(currentAccountEmail)
    let aPublicKeys = oPublicFromKey ? [oPublicFromKey] : []
    if (privateKey) {
        let paranoidKey = ''
        if (store.getters['filesmobile/currentStorage'].Type === 'shared') {
            paranoidKey = file.File?.ExtendedProps?.ParanoidKeyShared
        } else {
            paranoidKey = file.paranoidKey
        }
        const decryptData = await OpenPgp.decryptAndVerifyText(
            paranoidKey,
            privateKey,
            aPublicKeys,
            askOpenPgpKeyPassword,
            getParentComponent
        )
        if (decryptData?.sError) {
            notification.showError(decryptData.sError)
            //file.changeDownloadingStatus(false)
            return false
        }
        return decryptData.sDecryptedData
    } else {
        //file.changeDownloadingStatus(false)
        notification.showError('No private key found for file decryption.')
    }
}

export const viewEncryptFile = async (data) => {
    const file = store.getters['filesmobile/currentFile']
    let iv = file.initializationVector
    let paranoidEncryptedKey = file.paranoidKey
    const aesKey = await getAesKey(file, data.getParentComponent)
    await Crypto.viewEncryptedImage(file, iv, paranoidEncryptedKey, aesKey)
}


