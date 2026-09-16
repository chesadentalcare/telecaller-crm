import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, waitFor, fireEvent } from "@/tests/helpers/render"
import { UploadQueueView } from "@/components/telecaller/upload-queue-view"
import type { IntakeRow } from "@/lib/api/leads"

const useIntakeQueue = vi.hoisted(() => vi.fn())
const useSheetSyncStatus = vi.hoisted(() => vi.fn())
const uploadIntake = vi.hoisted(() => vi.fn())
const discardIntake = vi.hoisted(() => vi.fn())
const restoreIntake = vi.hoisted(() => vi.fn())
const syncSheet = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-leads", () => ({
  useIntakeQueue: (...a: unknown[]) => useIntakeQueue(...a),
  useSheetSyncStatus: () => useSheetSyncStatus(),
}))
vi.mock("@/hooks/use-lead-mutations", () => ({
  useUploadIntake: () => ({ mutateAsync: uploadIntake, isPending: false }),
  useDiscardIntake: () => ({ mutateAsync: discardIntake }),
  useRestoreIntake: () => ({ mutateAsync: restoreIntake }),
  useSyncSheet: () => ({ mutateAsync: syncSheet, isPending: false }),
}))
vi.mock("@/lib/api-config", () => ({
  apiUrl: (e: string) => `https://api.test${e}`,
  endpoints: { intakeTemplate: "/leads/intake/template" },
}))
vi.mock("@/lib/auth/token", () => ({ tokenStorage: { get: () => "tok" } }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Stub the heavy entry form — this test only asserts the queue wiring + that the dialog
// hands the row's intakeId + prefilled details to the form.
vi.mock("@/components/telecaller/quick-lead-entry", () => ({
  QuickLeadEntry: (props: { intakeId?: number; defaultValues?: { leadName?: string } }) => (
    <div data-testid="quick-lead-entry">form:{props.intakeId}:{props.defaultValues?.leadName}</div>
  ),
}))

const rows: IntakeRow[] = [{
  id: 7, batch_id: "b1", customer_name: "Dr. Asha Rao", phone: "9812345670",
  whatsapp_number: "9812345670", email: "asha@x.in", state: "Karnataka", city: "Bengaluru",
  source: "Facebook", uploaded_by: "neha", created_at: "2026-09-15T10:00:00Z",
}]

describe("<UploadQueueView>", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSheetSyncStatus.mockReturnValue({ data: undefined })
  })

  it("shows the empty state when the queue is empty", () => {
    useIntakeQueue.mockReturnValue({ data: { rows: [] }, isLoading: false })
    renderWithProviders(<UploadQueueView />)
    expect(screen.getByText(/Nothing waiting/i)).toBeInTheDocument()
  })

  it("renders a queued row (name, phone, city, source)", () => {
    useIntakeQueue.mockReturnValue({ data: { rows }, isLoading: false })
    renderWithProviders(<UploadQueueView />)
    expect(screen.getByText("Dr. Asha Rao")).toBeInTheDocument()
    expect(screen.getByText("9812345670")).toBeInTheDocument()
    expect(screen.getByText(/Bengaluru, Karnataka/)).toBeInTheDocument()
    expect(screen.getByText("Facebook")).toBeInTheDocument()
  })

  it("discard calls the mutation with the row id", async () => {
    useIntakeQueue.mockReturnValue({ data: { rows }, isLoading: false })
    discardIntake.mockResolvedValue({ discarded: 1 })
    const { user } = renderWithProviders(<UploadQueueView />)
    await user.click(screen.getByRole("button", { name: "Discard" }))
    expect(discardIntake).toHaveBeenCalledWith(7)
  })

  it("Discarded tab lists removed leads and Restore calls the mutation", async () => {
    useIntakeQueue.mockReturnValue({ data: { rows }, isLoading: false })
    restoreIntake.mockResolvedValue({ restored: 1 })
    const { user } = renderWithProviders(<UploadQueueView />)
    await user.click(screen.getByRole("button", { name: /^Discarded/i }))
    await user.click(screen.getByRole("button", { name: /restore/i }))
    expect(restoreIntake).toHaveBeenCalledWith(7)
  })

  it("uploading a file calls the mutation and shows the result summary", async () => {
    useIntakeQueue.mockReturnValue({ data: { rows: [] }, isLoading: false })
    uploadIntake.mockResolvedValue({ batchId: "b2", inserted: 5, skipped: [{ row: 3, reason: "invalid phone" }] })
    const { container } = renderWithProviders(<UploadQueueView />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["x"], "leads.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(uploadIntake).toHaveBeenCalledWith(expect.any(File)))
    expect(await screen.findByText(/5 added to the queue/i)).toBeInTheDocument()
    expect(screen.getByText(/Row 3: invalid phone/)).toBeInTheDocument()
  })

  it("Call & enter opens the prefilled form dialog with the row's intakeId", async () => {
    useIntakeQueue.mockReturnValue({ data: { rows }, isLoading: false })
    const { user } = renderWithProviders(<UploadQueueView />)
    await user.click(screen.getByRole("button", { name: /call & enter/i }))
    const form = await screen.findByTestId("quick-lead-entry")
    expect(form).toHaveTextContent("form:7:Dr. Asha Rao")
  })

  it("Sync now triggers the Google-Sheet sync", async () => {
    useIntakeQueue.mockReturnValue({ data: { rows: [] }, isLoading: false })
    syncSheet.mockResolvedValue({ ok: true, baseline: false, newCount: 2 })
    const { user } = renderWithProviders(<UploadQueueView />)
    await user.click(screen.getByRole("button", { name: /sync now/i }))
    expect(syncSheet).toHaveBeenCalled()
  })

  it("shows the last-synced status once the sheet has been baselined", () => {
    useIntakeQueue.mockReturnValue({ data: { rows: [] }, isLoading: false })
    useSheetSyncStatus.mockReturnValue({
      data: { enabled: false, baselineSet: true, lastOk: true, lastRunAt: "2026-09-16T08:00:00Z", lastNewCount: 0, lastSkippedCount: 0 },
    })
    renderWithProviders(<UploadQueueView />)
    expect(screen.getByText(/last synced/i)).toBeInTheDocument()
  })

  it("shows a sync-problem banner when the last sync failed", () => {
    useIntakeQueue.mockReturnValue({ data: { rows: [] }, isLoading: false })
    useSheetSyncStatus.mockReturnValue({
      data: { enabled: true, baselineSet: true, lastOk: false, lastError: "sheet not shared", lastRunAt: "2026-09-16T08:00:00Z" },
    })
    renderWithProviders(<UploadQueueView />)
    expect(screen.getByText(/Sync problem/i)).toBeInTheDocument()
    expect(screen.getByText(/sheet not shared/i)).toBeInTheDocument()
  })
})
