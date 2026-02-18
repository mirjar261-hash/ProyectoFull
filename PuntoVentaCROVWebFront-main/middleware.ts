import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const suspiciousPatterns = [
  /\bbusybox\b/i,
  /\bwget\b/i,
  /\bcurl\b/i,
  /\bchmod\b/i,
  /reactOnMynuts/i,
  /nuts\/x86/i,
];

export function middleware(request: NextRequest) {
  const requestSignature = `${request.nextUrl.toString()} ${request.headers.get("user-agent") ?? ""}`;

  if (suspiciousPatterns.some((pattern) => pattern.test(requestSignature))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
