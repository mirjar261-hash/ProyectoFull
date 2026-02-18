export default function AvisoDePrivacidadPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-slate-800">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-orange-600">Aviso de Privacidad</h1>
        <p className="mt-2 text-sm text-slate-500">
          Última actualización: {new Date().toLocaleDateString('es-MX')}
        </p>
      </header>

      <section className="space-y-6 text-justify text-sm leading-6">
        <p>
          CROV Punto de Venta, en lo sucesivo "CROV", con domicilio en Tepic, Nayarit, México, es responsable del uso y
          protección de sus datos personales. Este Aviso de Privacidad describe cómo recabamos, utilizamos y resguardamos la
          información que usted nos proporciona, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión
          de los Particulares.
        </p>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Datos personales que recabamos</h2>
          <p>
            Podemos solicitar datos de identificación, contacto, fiscales y de facturación, así como información relacionada con
            sus operaciones comerciales y uso de nuestra plataforma. Estos datos se obtienen cuando usted crea una cuenta, utiliza
            nuestros servicios, solicita soporte o participa en campañas comerciales.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Finalidades del tratamiento</h2>
          <p>
            Los datos recabados se utilizan para: (a) proporcionar acceso a la plataforma CROV y sus funcionalidades; (b) emitir
            facturación y comprobantes fiscales; (c) brindar soporte técnico y servicio al cliente; (d) enviar comunicaciones
            relacionadas con mejoras del servicio, campañas y eventos; y (e) cumplir con obligaciones legales y contractuales.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Transferencia de datos</h2>
          <p>
            CROV no comparte sus datos personales con terceros sin su consentimiento, salvo en los casos que establece la ley o
            cuando sea necesario para cumplir con obligaciones contractuales. Cuando realizamos transferencias, verificamos que
            los receptores cuenten con medidas de seguridad adecuadas.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">4. Derechos ARCO</h2>
          <p>
            Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición (ARCO), así como revocar su
            consentimiento o limitar el uso de sus datos personales, enviando un correo a{' '}
            <a href="mailto:privacidad@puntoventacrov.com" className="text-orange-600 underline">
              privacidad@puntoventacrov.com
            </a>
            . Su solicitud deberá incluir nombre completo, identificación oficial, descripción clara de los datos sobre los que
            desea ejercer el derecho y un medio de contacto para recibir la respuesta correspondiente.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">5. Medidas de seguridad</h2>
          <p>
            Implementamos medidas administrativas, técnicas y físicas para proteger sus datos personales contra daño, pérdida,
            alteración, destrucción o uso no autorizado. No obstante, ningún sistema es completamente infalible, por lo que le
            recomendamos mantener actualizados sus dispositivos y credenciales.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">6. Cambios al Aviso de Privacidad</h2>
          <p>
            CROV puede actualizar este Aviso de Privacidad para reflejar mejoras en nuestros procesos o cambios regulatorios. Las
            modificaciones estarán disponibles en{' '}
            <a href="https://puntoventacrov.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">
              https://puntoventacrov.com
            </a>{' '}
            y entrarán en vigor en la fecha de publicación. Le recomendamos revisar periódicamente este documento.
          </p>
        </div>

        <p>
          Al utilizar nuestra plataforma, usted reconoce que ha leído y comprendido este Aviso de Privacidad y acepta el
          tratamiento de sus datos personales conforme a los términos aquí descritos.
        </p>
      </section>
    </main>
  );
}
