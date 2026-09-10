import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen } from "@/tests/helpers/render"
import { LeadQueueRow } from "@/components/telecaller/lead-queue-row"

describe("<LeadQueueRow>", () => {
  it("renders identity (name, id, phone, equipment, location)", () => {
    renderWithProviders(
      <LeadQueueRow
        id="4200"
        name="Dr. Asha Rao"
        phone="9812345670"
        equipment="Dental Chair"
        location="Bengaluru"
      />,
    )
    expect(screen.getByText("Dr. Asha Rao")).toBeInTheDocument()
    expect(screen.getByText("#4200")).toBeInTheDocument()
    expect(screen.getByText("9812345670")).toBeInTheDocument()
    expect(screen.getByText("Dental Chair")).toBeInTheDocument()
    expect(screen.getByText("Bengaluru")).toBeInTheDocument()
  })

  it("derives initials from the name for the avatar", () => {
    renderWithProviders(<LeadQueueRow id="1" name="Asha Rao" />)
    expect(screen.getByText("AR")).toBeInTheDocument()
  })

  it("fires onOpen with the lead id when the name button is clicked", async () => {
    const onOpen = vi.fn()
    const { user } = renderWithProviders(
      <LeadQueueRow id="4200" name="Dr. Asha Rao" onOpen={onOpen} />,
    )
    await user.click(screen.getByRole("button", { name: "Dr. Asha Rao" }))
    expect(onOpen).toHaveBeenCalledWith("4200")
  })

  it("does not render a phone segment when the phone is a placeholder dash", () => {
    renderWithProviders(<LeadQueueRow id="1" name="No Phone" phone="—" equipment="Scanner" />)
    expect(screen.queryByText("—")).not.toBeInTheDocument()
    expect(screen.getByText("Scanner")).toBeInTheDocument()
  })

  it("renders the flagged badge when flagged is true", () => {
    renderWithProviders(<LeadQueueRow id="1" name="Flagged Lead" flagged />)
    expect(screen.getByText("Flagged")).toBeInTheDocument()
  })

  it("renders an urgent badge with its label", () => {
    renderWithProviders(
      <LeadQueueRow id="1" name="Wrong Num" urgent={{ label: "Wrong number" }} />,
    )
    expect(screen.getByText(/Wrong number/)).toBeInTheDocument()
  })

  it("shows the amber 'Needs reply' badge when awaiting a reply", () => {
    renderWithProviders(
      <LeadQueueRow
        id="1"
        name="Replied Lead"
        replied={{ hasUnread: true, awaitingReply: true, body: null, intent: null }}
      />,
    )
    expect(screen.getByText("Needs reply")).toBeInTheDocument()
  })

  it("shows the muted 'Replied' badge when there is an unread but no awaiting-reply", () => {
    renderWithProviders(
      <LeadQueueRow
        id="1"
        name="Answered Lead"
        replied={{ hasUnread: true, awaitingReply: false, body: null, intent: null }}
      />,
    )
    expect(screen.getByText("Replied")).toBeInTheDocument()
    expect(screen.queryByText("Needs reply")).not.toBeInTheDocument()
  })

  it("renders the reply snippet body with its intent label", () => {
    renderWithProviders(
      <LeadQueueRow
        id="1"
        name="Chatty Lead"
        replied={{
          hasUnread: true,
          awaitingReply: true,
          body: "Please call me back",
          intent: "meeting",
        }}
      />,
    )
    expect(screen.getByText(/Please call me back/)).toBeInTheDocument()
    expect(screen.getByText(/wants a meeting/)).toBeInTheDocument()
  })

  it("renders passed-in badge and actions nodes", () => {
    renderWithProviders(
      <LeadQueueRow
        id="1"
        name="Lead"
        badge={<span>STATUS</span>}
        actions={<button>Call</button>}
      />,
    )
    expect(screen.getByText("STATUS")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Call" })).toBeInTheDocument()
  })
})
