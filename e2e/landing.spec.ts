import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto('/welcome')

  await expect(
    page.getByRole('button', { name: 'Get Started' })
  ).toBeVisible()
  await expect(page.getByText('Origins by PROVENIQ')).toBeVisible()
})

test('api health check responds', async ({ request }) => {
  const response = await request.get('http://localhost:3001/api/health')

  expect(response.ok()).toBe(true)
  await expect(response.json()).resolves.toMatchObject({ status: 'ok' })
})
