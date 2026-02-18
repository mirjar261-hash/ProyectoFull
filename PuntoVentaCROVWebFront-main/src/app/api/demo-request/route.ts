import { NextResponse } from "next/server";

interface DemoRequestPayload {
  fullName?: string;
  phone?: string;
  email?: string;
  date?: string;
  time?: string;
}

const DEMO_REQUEST_PATH = "/demo-request";

function resolveDemoServiceUrl(requestUrl: string) {
  const baseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    return undefined;
  }

  if (baseUrl.startsWith("http")) {
    return `${baseUrl.replace(/\/$/, "")}${DEMO_REQUEST_PATH}`;
  }

  const requestOrigin = new URL(requestUrl).origin;
  return `${requestOrigin}${baseUrl}${DEMO_REQUEST_PATH}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DemoRequestPayload;
    const { fullName, phone, email, date, time } = body;

    if (!fullName || !phone || !email || !date || !time) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const serviceUrl = resolveDemoServiceUrl(request.url);

    if (!serviceUrl) {
      console.error("API_URL o NEXT_PUBLIC_API_URL no están configuradas para demo-request");
      return NextResponse.json(
        { error: "El servicio de agenda no está configurado." },
        { status: 500 }
      );
    }

    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const errorMessage =
        (typeof responseData === "object" &&
          responseData !== null &&
          "error" in responseData &&
          typeof responseData.error === "string" &&
          responseData.error) ||
        "No se pudo enviar la notificación por correo. Inténtalo más tarde.";

      console.error(
        "Error al reenviar la solicitud de demostración",
        errorMessage,
        { status: response.status }
      );

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData ?? { success: true });
  } catch (error) {
    console.error("Error inesperado al procesar la solicitud de demostración", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado. Inténtalo nuevamente." },
      { status: 500 }
    );
  }
}
