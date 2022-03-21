import OpenPgp from "../../../OpenPgpMobileWebclient/vue-mobile/openpgp-helper";
import Crypto from "../crypto/CCrypto";
import { askOpenPgpKeyPassword } from "../../../OpenPgpMobileWebclient/vue-mobile/utils";
import { getNewUid } from "./utils";
import { parseUploadedFile } from "../../../FilesMobileWebclient/vue-mobile/utils/common";
import store from "src/store";
import _ from "lodash";
import { getCoreParanoidEncryptionSettings } from "../settings";
import notification from "src/utils/notification";

let fileIndex = 0
let data = null
let currentFiles = null

const finishUploadingFiles = async () => {
    fileIndex = 0
    await store.dispatch('filesmobile/asyncGetFiles')
    await store.dispatch('filesmobile/removeUploadedFiles')
    if (currentFiles) {
        await store.dispatch('filesmobile/removeSelectedUploadedFiles', currentFiles)
        currentFiles = null
    }
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
        await store.dispatch('filesmobile/removeSelectedUploadedFiles', currentFiles)
        notification.showError(`PGP key for ${currentAccountEmail} user is missing. Both public and private PGP keys are required.`)
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

export const initUpload = (params) => {
    data = params
}

export const onFileAdded = async (files, uploader) => {
    const currentPath = store.getters['filesmobile/currentPath']
    const currentStorage = store.getters['filesmobile/currentStorage']
    const parsedFiles = files.map((file) => {
        return parseUploadedFile(
            file,
            currentPath,
            currentStorage.Type
        )
    })
    currentFiles = parsedFiles

    await store.dispatch('filesmobile/addDownloadsFiles', parsedFiles)
    const settings = getCoreParanoidEncryptionSettings()
    if (settings.enableInPersonalStorage && settings.enableParanoidEncryption && data.storage === 'personal') {
        const parent = data.getParentComponent('App')
        const fileUploadTypeSelectionDialog = parent.$refs.FileUploadTypeSelectionDialog
        if (_.isArray(fileUploadTypeSelectionDialog)) {
            fileUploadTypeSelectionDialog[0].openDialog(uploadEncryptFiles, data.methods, parsedFiles)
        }
        if (_.isObject(fileUploadTypeSelectionDialog) && !_.isArray(fileUploadTypeSelectionDialog)) {
            fileUploadTypeSelectionDialog.openDialog(uploadEncryptFiles, data.methods, parsedFiles)
        }

    } else {
        await uploadEncryptFiles()
    }
}
