import eventBus from 'src/event-bus'
import notification from "../../../CoreMobileWebclient/vue-mobile/src/utils/notification";
import { getCoreParanoidEncryptionSettings } from "../settings";
import { askOpenPgpKeyPassword } from "../../../OpenPgpMobileWebclient/vue-mobile/utils";
import { onFileAdded, initUpload } from "./upload";
import OpenPgp from "../../../OpenPgpMobileWebclient/vue-mobile/openpgp-helper";
import store from "src/store";
import _ from 'lodash'

import Crypto from "../crypto/CCrypto";

const onSetUploadMethods = (methods) => {
    eventBus.$emit('onUploadFiles', {
        factory: null,
        added: onFileAdded,
        uploaded: null,
        finish: methods.finish,
    })
}

export const onContinueUploadingFiles = async (params) => {
    initUpload(params)
    const settings = getCoreParanoidEncryptionSettings()

    if (
        params.storage === 'encrypted'
        || settings.enableInPersonalStorage && settings.enableParanoidEncryption && params.storage === 'personal'
    ) {
        onSetUploadMethods(params.methods)
    } else {
        eventBus.$emit('onUploadFiles', params.methods)
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
            return false
        }

        store.dispatch('filesmobile/changeItemProperty', {
            item: file,
            property: 'decryptionProgress',
            value: true
        })

        return decryptData.sDecryptedData
    } else {
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

export const downloadEncryptedFile = async (data) => {
    const file = store.getters['filesmobile/currentFile']
    let iv = file.initializationVector
    let paranoidEncryptedKey = file.paranoidKey
    const aesKey = await getAesKey(file, data.getParentComponent)
    await Crypto.downloadDividedFile(file, iv, null, null, paranoidEncryptedKey, aesKey )
}


