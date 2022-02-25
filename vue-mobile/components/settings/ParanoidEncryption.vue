<template>
  <div class="q-pa-lg settings flex content-between">
    <div>
      <app-checkbox
        class="settings__label"
        v-model="enableModule"
        left-label
        :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_ENABLE_JSCRYPTO')"
      />
      <div class="settings__caption text-secondary q-mt-md">
        <span>{{ $t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.HINT_ABOUT_JSCRYPTO') }}</span>
      </div>
      <app-checkbox
        class="settings__label q-mt-md"
        v-model="enableInPersonalStorage"
        left-label
        :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_ALLOW_ENCRYPT_IN_PERSONAL_STORAGE')"
      />
      <div class="settings__caption text-secondary q-mt-md">
        <span>{{$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.HINT_ENCRYPT_IN_PERSONAL_STORAGE')}}</span>
      </div>
      <div>
        <div v-if="!enableBackwardCompatibility">
          <app-button
            @click="enableBackwardCompatibility = true"
            :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.ACTION_ENABLE_BACKWARD_COMPATIBILITY')"
            class="q-mt-lg"
          />
        </div>
        <div v-if="enableBackwardCompatibility && !aesKey">
          <div class="settings__label q-pt-md">
            <p>
              To start using encryption of uploaded files you need to set an
              encryption key first.
            </p>
          </div>
          <div class="settings__caption text-secondary q-pt-md">
            <p>
              The AES key will be used only to decrypt the files that are
              encrypted using the old encryption mode. The new files will be
              encrypted using modern encryption mode.
            </p>
          </div>
          <app-button
            :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.ACTION_IMPORT_FILE_KEY')"
            class="q-mt-lg"
          />
          <app-button
            :label="$t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.ACTION_IMPORT_STRING_KEY')"
            @click="showImportKeyDialog = true"
            class="q-mt-md"
          />
        </div>
        <div v-if="enableBackwardCompatibility && aesKey">
          <div class="settings__label q-mt-md">
            <p>
              The AES key will be used only to decrypt the files that are
              encrypted using the old encryption mode. The new files will be
              encrypted using modern encryption mode.
            </p>
          </div>
          <div class="settings__label q-my-md">
            <div><p>Encryption key:</p></div>
            <div class="q-mt-sm">
              <p>{{ aesKey.keyName }}</p>
            </div>
            <q-separator class="q-mt-sm" />
          </div>
          <div class="settings__caption q-mt-md text-secondary">
            <p>
              {{ $t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.HINT_ABOUT_KEY_EXPORT') }}
            </p>
          </div>
          <app-button label="Share key" class="q-mt-lg" @click="showImportKeyDialog = true" />
          <app-button label="Download key" @click="showImportKeyDialog = true" class="q-mt-md" />
          <app-button label="Delete key" @click="showImportKeyDialog = true" class="q-my-md" />
        </div>
      </div>
    </div>
    <div class="full-width">
      <app-button class="settings__save-btn" @click="save" :label="$t('COREWEBCLIENT.ACTION_SAVE')" />
    </div>
    <import-key-from-string
      v-model="showImportKeyDialog"
      @close="showAesKey()"
    />
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import VueCookies from 'vue-cookies'

import {
  getCoreParanoidEncryptionSettings,
  setCoreParanoidEncryptionSettings
} from '../../settings'

import AppCheckbox from 'src/components/common/AppCheckbox'
import AppButton from 'src/components/common/AppButton'
import ImportKeyFromString from './dialogs/ImportKeyFromString'

export default {
  name: 'ParanoidEncryption',

  components: {
    AppCheckbox,
    AppButton,
    ImportKeyFromString,
  },

  data: () => ({
    enableModule: false,
    enableInPersonalStorage: false,
    enableBackwardCompatibility: false,
    showImportKeyDialog: false,
    aesKey: null,
  }),

  mounted() {
    const data = getCoreParanoidEncryptionSettings()
    this.enableModule = data.enableModule
    this.enableInPersonalStorage = data.enableInPersonalStorage
    this.aesKey = VueCookies.get('AesKey')
  },

  methods: {
    ...mapActions('coreparanoidencryptionplugin', ['asyncChangeParanoidEncryptionSettings']),
    async save() {
      const parameters = {
        EnableModule: this.enableModule,
        EnableInPersonalStorage: this.enableInPersonalStorage,
      }
      const result = await this.asyncChangeParanoidEncryptionSettings(
        parameters
      )
      if (result) {
        setCoreParanoidEncryptionSettings(this.enableModule, this.enableInPersonalStorage)
      }
    },
    showAesKey(dialog) {
      this[dialog] = false
      this.aesKey = VueCookies.get('AesKey')
    },
  },
}
</script>

<style lang="scss" scoped>
.settings {
  height: 86vh;
  &__label {
    font-size: 14px;
    line-height: 16px;
    letter-spacing: 0.3px;
  }
  &__caption {
    font-size: 12px;
    line-height: 14px;
  }
  &__save-btn {
    margin-bottom: 40px;
  }
}
</style>
