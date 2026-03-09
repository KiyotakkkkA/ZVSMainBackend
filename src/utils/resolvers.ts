export function resolveOs(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('windows')) {
    return 'Windows';
  }

  if (ua.includes('android')) {
    return 'Android';
  }

  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    return 'iOS';
  }

  if (ua.includes('mac os') || ua.includes('macintosh')) {
    return 'macOS';
  }

  if (ua.includes('linux')) {
    return 'Linux';
  }

  return 'Unknown OS';
}

export function resolveBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('zvsassistant/')) {
    return 'ZVS Assistant';
  }

  if (ua.includes('edg/')) {
    return 'Edge';
  }

  if (ua.includes('opr/') || ua.includes('opera')) {
    return 'Opera';
  }

  if (ua.includes('firefox/')) {
    return 'Firefox';
  }

  if (ua.includes('chrome/') && !ua.includes('edg/')) {
    return 'Chrome';
  }

  if (ua.includes('safari/') && !ua.includes('chrome/')) {
    return 'Safari';
  }

  return 'Unknown Browser';
}

export function resolveDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone') || ua.includes('android')) {
    return 'mobile';
  }

  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'tablet';
  }

  return 'desktop';
}
