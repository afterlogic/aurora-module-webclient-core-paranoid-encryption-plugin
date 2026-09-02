const path = require('path')
const fs = require('fs')
const { sharedHelper, moduleHelper } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { gotoLoggedIn, step, attachScreenshot, hasCredentials } = sharedHelper('login')
const { clickReady, confirmOkIfVisible } = sharedHelper('ready')
const { openSettings } = moduleHelper('SettingsWebclient', 'settings')
const {
  openFiles,
  openPersonalStorage,
  openNewItemsMenu,
  filesItemByName,
  fixturePath,
  waitForListReady,
  listReadyOptions,
  openFileByName,
  deleteOpenedFile,
} = moduleHelper('FilesWebclient', 'files')

const paranoidPassword = process.env.E2E_PARANOID_PASSWORD || 'e2e-paranoid-test'

async function startUploadViaFab(page, uniqueName) {
  await openNewItemsMenu(page)
  const fileInput = page.locator('input[type="file"]').first()
  const buffer = fs.readFileSync(fixturePath)
  if ((await fileInput.count()) > 0) {
    await fileInput.setInputFiles({
      name: uniqueName,
      mimeType: 'text/plain',
      buffer,
    })
  } else {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      clickReady(page.getByTestId('files-upload')),
    ])
    await fileChooser.setFiles({
      name: uniqueName,
      mimeType: 'text/plain',
      buffer,
    })
  }
}

/** "Protect your key" (new key) or "Input password" (existing key) popup. */
async function submitParanoidKeyPassword(page, password) {
  const keyPopup = page
    .locator('.popup:visible')
    .filter({ has: page.locator('input[type="password"]') })
    .first()
  await expect(keyPopup).toBeVisible({ timeout: T(30000) })
  const inputs = keyPopup.locator('input[type="password"]')
  const count = await inputs.count()
  if (count >= 2) {
    await inputs.nth(0).fill(password)
    await inputs.nth(1).fill(password)
  } else {
    await inputs.first().fill(password)
  }
  await clickReady(
    keyPopup.locator('.button').filter({ hasText: /^ok$/i }).first()
  )
  await expect(keyPopup).toBeHidden({ timeout: T(60000) })
}

test.describe('Desktop Paranoid Encryption files', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_PRIMARY in .env.e2e')

  test('uploads file with client-side encryption enabled', async ({ page }) => {
    test.setTimeout(T(360000))
    const uniqueName = `e2e-paranoid-${Date.now()}.txt`

    await gotoLoggedIn(page)
    await openSettings(page)

    const paranoidTab = page
      .getByTestId('settings-tab')
      .filter({ hasText: /paranoid|encryption/i })
    test.skip(
      (await paranoidTab.count()) === 0,
      'Paranoid Encryption tab is not available on this stand'
    )

    await step('Enable Paranoid Encryption in settings', async () => {
      await clickReady(paranoidTab.first())
      const enable = page.getByRole('checkbox', {
        name: /enable paranoid encryption/i,
      })
      await expect(enable).toBeVisible({ timeout: T(30000) })
      if (!(await enable.isChecked())) {
        await clickReady(page.locator('label[for="enableJscrypto"]'))
        await clickReady(
          page.locator('[data-test-id="settings-paranoid"] .button').first()
        )
      }
      const personal = page.getByRole('checkbox', {
        name: /allow encrypting files in personal storage/i,
      })
      if ((await personal.count()) > 0 && !(await personal.isChecked())) {
        await clickReady(page.locator('label[for="enableInPersonalStorage"]'))
        await clickReady(
          page.locator('[data-test-id="settings-paranoid"] .button').first()
        )
      }
      await attachScreenshot(page, 'paranoid-files-01-settings')
    })

    await step('Upload and choose encrypt', async () => {
      await openFiles(page)
      await openPersonalStorage(page)
      await startUploadViaFab(page, uniqueName)

      const encryptDialog = page.locator('.popup:visible').filter({
        has: page.getByTestId('files-upload-encrypt'),
      })
      const appeared = await encryptDialog
        .waitFor({ state: 'visible', timeout: T(30000) })
        .then(() => true)
        .catch(() => false)
      test.skip(
        !appeared,
        'Encrypt-on-upload dialog did not appear (Paranoid upload hook off on stand)'
      )
      await clickReady(page.getByTestId('files-upload-encrypt'))

      const keyDialogVisible = await page
        .locator('.popup:visible input[type="password"]')
        .first()
        .waitFor({ state: 'visible', timeout: T(30000) })
        .then(() => true)
        .catch(() => false)
      if (keyDialogVisible) {
        await submitParanoidKeyPassword(page, paranoidPassword)
      }

      const item = filesItemByName(page, uniqueName)
      await expect(item).toBeVisible({ timeout: T(180000) })
      await waitForListReady(page, listReadyOptions)
      console.log(`  → Encrypted upload finished: ${uniqueName}`)
      await attachScreenshot(page, 'paranoid-files-02-uploaded')
    })

    await step('Cleanup: delete uploaded file', async () => {
      await confirmOkIfVisible(page, 5000)
      await openFileByName(page, uniqueName)
      await deleteOpenedFile(page, uniqueName)
    })
  })
})
