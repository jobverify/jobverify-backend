// These checks identify missing content and explicit non-vacancies, not job types.
export const isPlaceholderClassificationText = value => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length <= 1 || !/[\p{L}\p{N}]/u.test(text)
    || /^(?:n\s*\/?\s*a|not\s+(?:available|applicable|provided|specified)|tbd|tba|to\s+be\s+(?:announced|determined)|coming\s+soon|(?:enter\s+(?:the\s+)?)?job\s+description|description)[\s.!:]*$/i.test(text)
}

export const isExplicitTestPosting = title => /\b(?:job|posting|vacancy|requisition)\s+(?:is\s+)?(?:for\s+)?(?:a\s+)?system\s+test\s+only\d*\b|\b(?:this\s+is\s+(?:a\s+)?)?(?:dummy|test)\s+(?:job|posting|vacancy|requisition)\s*[-:,(]?\s*(?:only|do\s+not\s+apply)\b/i
  .test(String(title ?? '').replace(/_/g, ' '))
