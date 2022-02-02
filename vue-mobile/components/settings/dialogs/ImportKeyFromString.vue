<template>
  <q-dialog v-bind="$attrs">
    <q-card class="q-dialog-size q-pt-md" style="min-width: 300px">
      <q-item>
        <app-dialog-input
          v-model="keyName"
          :placeholder="
            $t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_KEY_NAME')
          "
        />
      </q-item>
      <q-item>
        <app-dialog-input
          v-model="key"
          :placeholder="
            $t('COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_YOUR_KEY')
          "
          :autofocus="true"
        />
      </q-item>
      <q-card-actions align="right">
        <button-dialog
          :saving="saving"
          :action="importKey"
          :label="$t('COREWEBCLIENT.ACTION_SAVE')"
        />
        <button-dialog
          :saving="saving"
          v-close-popup
          :label="$t('COREWEBCLIENT.ACTION_CLOSE')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import VueCookies from 'vue-cookies'

import ButtonDialog from 'src/components/common/ButtonDialog'
import AppDialogInput from 'src/components/common/AppDialogInput'

export default {
  name: 'ImportKeyFromString',
  components: {
    ButtonDialog,
    AppDialogInput,
  },
  data: () => ({
    saving: false,
    keyName: '',
    key: '',
  }),
  methods: {
    importKey() {
      const aesKey = {
        keyName: this.keyName,
        key: this.key,
      }
      VueCookies.set('AesKey', JSON.stringify(aesKey))
      this.$emit('close')
    },
  },
}
</script>

<style scoped></style>
