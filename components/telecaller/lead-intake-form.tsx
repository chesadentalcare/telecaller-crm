"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserPlus, Phone, MapPin, CheckCircle2 } from "lucide-react"

interface FormData {
  leadName: string
  phoneNumber: string
  equipmentInterest: string
  source: string
  city: string
}

interface FormErrors {
  leadName?: string
  phoneNumber?: string
  equipmentInterest?: string
  source?: string
  city?: string
}

export function LeadIntakeForm() {
  const [formData, setFormData] = useState<FormData>({
    leadName: "",
    phoneNumber: "",
    equipmentInterest: "",
    source: "",
    city: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.leadName.trim()) {
      newErrors.leadName = "Lead name is required"
    } else if (formData.leadName.length < 2) {
      newErrors.leadName = "Name must be at least 2 characters"
    }

    const phoneRegex = /^[6-9]\d{9}$/
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required"
    } else if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ""))) {
      newErrors.phoneNumber = "Enter a valid 10-digit Indian mobile number"
    }

    if (!formData.equipmentInterest) {
      newErrors.equipmentInterest = "Please select equipment interest"
    }

    if (!formData.source) {
      newErrors.source = "Please select a source"
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSubmitSuccess(true)
    setIsSubmitting(false)
    
    setTimeout(() => {
      setFormData({
        leadName: "",
        phoneNumber: "",
        equipmentInterest: "",
        source: "",
        city: "",
      })
      setSubmitSuccess(false)
    }, 2000)
  }

  const equipmentOptions = [
    "Dental Chair",
    "X-Ray Unit",
    "Autoclave",
    "Compressor",
    "Handpiece",
    "Scaler",
    "Light Cure",
    "Imaging System",
    "Other",
  ]

  const sourceOptions = [
    "Website Inquiry",
    "Trade Show",
    "Referral",
    "Cold Call",
    "Social Media",
    "Google Ads",
    "Email Campaign",
    "Walk-in",
  ]

  if (submitSuccess) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex size-16 items-center justify-center rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Lead Added Successfully!</h3>
          <p className="text-sm text-muted-foreground">The lead has been added to your pipeline.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">New Lead Intake</CardTitle>
            <CardDescription className="text-xs">Capture new lead information</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Name */}
          <div className="space-y-1.5">
            <Label htmlFor="leadName" className="text-xs font-medium text-foreground">
              Lead Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="leadName"
              placeholder="Dr. Ramesh Sharma"
              value={formData.leadName}
              onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
              className={`h-9 ${errors.leadName ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.leadName && (
              <p className="text-[11px] text-destructive">{errors.leadName}</p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-xs font-medium text-foreground">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phoneNumber"
                placeholder="9876543210"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                className={`h-9 pl-9 ${errors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-[11px] text-destructive">{errors.phoneNumber}</p>
            )}
          </div>

          {/* Equipment Interest */}
          <div className="space-y-1.5">
            <Label htmlFor="equipmentInterest" className="text-xs font-medium text-foreground">
              Equipment Interest <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.equipmentInterest}
              onValueChange={(value) => setFormData({ ...formData, equipmentInterest: value })}
            >
              <SelectTrigger className={`h-9 ${errors.equipmentInterest ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
              <SelectContent>
                {equipmentOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-sm">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipmentInterest && (
              <p className="text-[11px] text-destructive">{errors.equipmentInterest}</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="source" className="text-xs font-medium text-foreground">
              Lead Source <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.source}
              onValueChange={(value) => setFormData({ ...formData, source: value })}
            >
              <SelectTrigger className={`h-9 ${errors.source ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select lead source" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-sm">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source && (
              <p className="text-[11px] text-destructive">{errors.source}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-medium text-foreground">
              City <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="city"
                placeholder="Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={`h-9 pl-9 ${errors.city ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {errors.city && (
              <p className="text-[11px] text-destructive">{errors.city}</p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-10"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding Lead..." : "Add Lead to Pipeline"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
