"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ClipboardList, 
  Phone, 
  Video,
  MapPin,
  Droplets,
  CheckCircle2,
  User,
  Building2,
  Clock,
  IndianRupee,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QualificationData {
  phoneVerified: boolean
  dentistType: string
  practiceType: string
  timeline: string
  budgetRange: string
  routeSelection: string
}

interface LeadInfo {
  name: string
  phone: string
  equipment: string
}

interface RapidQualificationFormProps {
  lead?: LeadInfo
}

export function RapidQualificationForm({ lead }: RapidQualificationFormProps) {
  const [formData, setFormData] = useState<QualificationData>({
    phoneVerified: false,
    dentistType: "",
    practiceType: "",
    timeline: "",
    budgetRange: "",
    routeSelection: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const dentistTypes = [
    "General Dentist",
    "Orthodontist",
    "Periodontist",
    "Endodontist",
    "Oral Surgeon",
    "Pediatric Dentist",
    "Prosthodontist",
  ]

  const practiceTypes = [
    "Solo Practice",
    "Group Practice",
    "Hospital/Clinic Chain",
    "Dental College",
    "Corporate Dental",
    "Mobile Dental Unit",
  ]

  const timelineOptions = [
    { value: "immediate", label: "Immediate", desc: "< 1 week" },
    { value: "short", label: "Short Term", desc: "1-4 weeks" },
    { value: "medium", label: "Medium Term", desc: "1-3 months" },
    { value: "long", label: "Long Term", desc: "3-6 months" },
    { value: "future", label: "Future", desc: "6+ months" },
  ]

  const budgetRanges = [
    "Under ₹50,000",
    "₹50K - ₹1L",
    "₹1L - ₹2.5L",
    "₹2.5L - ₹5L",
    "₹5L - ₹10L",
    "Above ₹10L",
  ]

  const routeOptions = [
    { 
      id: "online-meeting", 
      label: "Online Meeting", 
      desc: "Schedule video demo",
      icon: Video,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary"
    },
    { 
      id: "physical-meeting", 
      label: "Physical Meeting", 
      desc: "In-person clinic demo",
      icon: MapPin,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success"
    },
    { 
      id: "drip", 
      label: "Add to Drip", 
      desc: "Nurture over time",
      icon: Droplets,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
      borderColor: "border-chart-3"
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSubmitSuccess(true)
    setIsSubmitting(false)
  }

  const isFormComplete = formData.dentistType && formData.practiceType && 
    formData.timeline && formData.budgetRange && formData.routeSelection

  if (submitSuccess) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Lead Qualified!</h3>
          <p className="text-sm text-muted-foreground text-center">
            {formData.routeSelection === "drip" 
              ? "Lead has been added to the drip queue."
              : `${formData.routeSelection === "online-meeting" ? "Online" : "Physical"} meeting to be scheduled.`
            }
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setSubmitSuccess(false)
              setFormData({
                phoneVerified: false,
                dentistType: "",
                practiceType: "",
                timeline: "",
                budgetRange: "",
                routeSelection: "",
              })
            }}
          >
            Qualify Another Lead
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Rapid Qualification</CardTitle>
            <CardDescription className="text-xs">
              {lead ? `Qualifying: ${lead.name}` : "Qualify lead for next steps"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Phone Verified Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-background">
                <Phone className="size-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="phoneVerified" className="text-sm font-medium text-foreground cursor-pointer">
                  Phone Verified
                </Label>
                <p className="text-[11px] text-muted-foreground">Contact successfully reached</p>
              </div>
            </div>
            <Switch
              id="phoneVerified"
              checked={formData.phoneVerified}
              onCheckedChange={(checked) => setFormData({ ...formData, phoneVerified: checked })}
            />
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Dentist Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground" />
                Dentist Type
              </Label>
              <Select
                value={formData.dentistType}
                onValueChange={(value) => setFormData({ ...formData, dentistType: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {dentistTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-sm">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Practice Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="size-3 text-muted-foreground" />
                Practice Type
              </Label>
              <Select
                value={formData.practiceType}
                onValueChange={(value) => setFormData({ ...formData, practiceType: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select practice" />
                </SelectTrigger>
                <SelectContent>
                  {practiceTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-sm">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Clock className="size-3 text-muted-foreground" />
              Purchase Timeline
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              {timelineOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, timeline: option.value })}
                  className={cn(
                    "flex flex-col items-center rounded-lg border px-2 py-2.5 text-center transition-colors",
                    formData.timeline === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background hover:bg-muted/50 text-foreground"
                  )}
                >
                  <span className="text-[11px] font-medium">{option.label}</span>
                  <span className="text-[9px] text-muted-foreground">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <IndianRupee className="size-3 text-muted-foreground" />
              Budget Range
            </Label>
            <Select
              value={formData.budgetRange}
              onValueChange={(value) => setFormData({ ...formData, budgetRange: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                {budgetRanges.map((range) => (
                  <SelectItem key={range} value={range} className="text-sm">
                    {range}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Route Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Next Step Route</Label>
            <div className="grid grid-cols-3 gap-2">
              {routeOptions.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, routeSelection: route.id })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
                    formData.routeSelection === route.id
                      ? `${route.borderColor} ${route.bgColor}`
                      : "border-border bg-background hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-full",
                    formData.routeSelection === route.id ? route.bgColor : "bg-muted"
                  )}>
                    <route.icon className={cn(
                      "size-5",
                      formData.routeSelection === route.id ? route.color : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-xs font-medium",
                      formData.routeSelection === route.id ? route.color : "text-foreground"
                    )}>
                      {route.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{route.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10"
            disabled={!isFormComplete || isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Complete Qualification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
