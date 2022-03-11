import _ from 'lodash'
import { i18n } from "../../CoreMobileWebclient/vue-mobile/src/boot/i18n";
import eventBus from 'src/event-bus'
import { defineAsyncComponent, shallowRef } from 'vue'

import settings from './settings'



const _getSettingsTabs = params => {
  if (!_.isArray(params.settingsTabs)) {
    params.settingsTabs = []
  }
  params.settingsTabs = params.settingsTabs.concat([
    {
      routerPath: '/settings/paranoid-encryption',
      tabNameLangConst: 'COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_SETTINGS_TAB',
      getIconComponent: () => import('./components/icons/ParanoidIcon'),
    },
  ])
}

const _getSettingsPageChildren = params => {
  if (!_.isArray(params.settingsPageChildren)) {
    params.settingsPageChildren = []
  }
  params.settingsPageChildren = params.settingsPageChildren.concat([
    {
      path: '/settings/paranoid-encryption',
      component: () => import('./components/settings/ParanoidEncryption'),
    },
  ])
}

const _getSettingsHeaderTitles = params => {
  if (!_.isArray(params.settingsHeaderTitles)) {
    params.settingsHeaderTitles = []
  }
  params.settingsHeaderTitles = params.settingsHeaderTitles.concat([
    {
      settingsPath: '/settings/paranoid-encryption',
      settingsTitle: i18n.global.t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_SETTINGS_TAB'),
    },
  ])
}


const _getEncryptedShareableLinkDialog = (callBack) => {
  callBack({
    head: shallowRef(defineAsyncComponent(() => import('./components/files/dialogs/encrypted-shareable-link/EncryptedShareableLinkHead'))),
    actions: shallowRef(defineAsyncComponent(() => import('./components/files/dialogs/encrypted-shareable-link/EncryptedShareableLinkActions')))
  })
}

export default {
  moduleName: 'CoreParanoidEncryptionWebclientPlugin',

  requiredModules: [],

  init (appdata) {
    settings.init(appdata)

    const fileOperations = require('./files/file-operations')

    eventBus.$off('OnFileAdded', fileOperations.onContinueUploadingFiles)
    eventBus.$on('OnFileAdded', fileOperations.onContinueUploadingFiles)

    eventBus.$off('CoreMobileWebclient::viewFile', fileOperations.viewEncryptFile)
    eventBus.$on('CoreMobileWebclient::viewFile', fileOperations.viewEncryptFile)

    eventBus.$off('FilesMobileWebclient::ShareEncryptFile', fileOperations.onShareEncryptFile)
    eventBus.$on('FilesMobileWebclient::ShareEncryptFile', fileOperations.onShareEncryptFile)

    eventBus.$off('CoreParanoidEncryptionWebclientPlugin::downloadEncryptedFile',
        fileOperations.downloadEncryptedFile
    )
    eventBus.$on('CoreParanoidEncryptionWebclientPlugin::downloadEncryptedFile',
        fileOperations.downloadEncryptedFile
    )
  },

  initSubscriptions (appData) {
    eventBus.$off('SettingsMobileWebclient::GetSettingsPageChildren', _getSettingsPageChildren)
    eventBus.$on('SettingsMobileWebclient::GetSettingsPageChildren', _getSettingsPageChildren)

    eventBus.$off('SettingsMobileWebclient::GetSettingsTabs', _getSettingsTabs)
    eventBus.$on('SettingsMobileWebclient::GetSettingsTabs', _getSettingsTabs)

    eventBus.$off('SettingsMobileWebclient::GetSettingsHeaderTitles', _getSettingsHeaderTitles)
    eventBus.$on('SettingsMobileWebclient::GetSettingsHeaderTitles', _getSettingsHeaderTitles)

    eventBus.$off('FilesMobile::GetEncryptedShareableLinkDialog', _getEncryptedShareableLinkDialog)
    eventBus.$on('FilesMobile::GetEncryptedShareableLinkDialog', _getEncryptedShareableLinkDialog)
  },
}
