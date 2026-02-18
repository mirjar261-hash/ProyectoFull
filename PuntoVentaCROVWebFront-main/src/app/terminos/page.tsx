export default function TerminosDeServicioPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-slate-800">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-orange-600">Términos de Servicio</h1>
        <p className="mt-2 text-sm text-slate-500">
          Última actualización: {new Date().toLocaleDateString('es-MX')}
        </p>
      </header>

      <section className="space-y-6 text-justify text-sm leading-6">
        <p>
          Los presentes Términos de Servicio regulan el acceso y uso de la plataforma CROV Punto de Venta (en adelante, "CROV"),
          así como las responsabilidades y obligaciones derivadas de su utilización por parte de los usuarios. Al crear una
          cuenta, ingresar a la plataforma o hacer uso de cualquiera de nuestras funcionalidades, usted reconoce que ha leído,
          comprendido y aceptado estos Términos.
        </p>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">1. Uso de la plataforma</h2>
          <p>
            CROV proporciona herramientas para gestionar operaciones comerciales, inventarios, facturación y procesos de punto de
            venta. Usted se compromete a utilizar la plataforma únicamente para fines legítimos y conforme a las leyes aplicables,
            absteniéndose de realizar actividades que puedan dañar, inutilizar o afectar el desempeño del servicio o de otros
            usuarios.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">2. Registro y credenciales</h2>
          <p>
            Para acceder a CROV es necesario crear una cuenta con información veraz y actualizada. Usted es responsable de
            mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas bajo su cuenta. En
            caso de detectar un uso no autorizado, deberá notificarlo inmediatamente a nuestro equipo de soporte.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">3. Planes, pagos y renovaciones</h2>
          <p>
            Algunos servicios de CROV pueden requerir el pago de suscripciones o tarifas adicionales. Al contratar un plan,
            autoriza los cargos correspondientes y acepta que las renovaciones se efectuarán conforme a las condiciones acordadas.
            Las políticas de cancelación, reembolsos y prorrateos se comunicarán durante el proceso de contratación.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">4. Propiedad intelectual</h2>
          <p>
            CROV, sus logotipos, interfaces, diseños y código fuente son propiedad exclusiva de CROV Punto de Venta o de sus
            licenciantes. Queda prohibida su reproducción, modificación o distribución sin autorización expresa. Usted mantiene la
            titularidad de los datos y contenidos que incorpore en la plataforma, otorgando a CROV una licencia limitada para
            procesarlos y almacenarlos con el fin de prestar el servicio.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">5. Disponibilidad y soporte</h2>
          <p>
            Nos esforzamos por garantizar la disponibilidad continua de la plataforma; sin embargo, CROV no garantiza que el
            servicio esté libre de interrupciones o errores. Programaremos mantenimientos y actualizaciones procurando minimizar
            afectaciones. El soporte técnico estará disponible a través de los canales oficiales publicados en nuestro sitio web.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">6. Limitación de responsabilidad</h2>
          <p>
            CROV no será responsable por daños indirectos, incidentales o consecuenciales derivados del uso o imposibilidad de uso
            de la plataforma. Nuestra responsabilidad total frente a cualquier reclamo se limitará al monto efectivamente pagado
            por el usuario durante los 12 meses previos al evento que originó la reclamación, en la medida que la legislación
            aplicable lo permita.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">7. Terminación</h2>
          <p>
            Usted puede cancelar su cuenta en cualquier momento siguiendo los procesos establecidos dentro de la plataforma o
            contactando a nuestro equipo de soporte. CROV podrá suspender o cancelar el acceso en caso de incumplimiento de estos
            Términos, actividades fraudulentas o uso indebido de la plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">8. Modificaciones</h2>
          <p>
            CROV podrá actualizar estos Términos de Servicio para reflejar cambios legales, mejoras en el producto o ajustes
            operativos. Las modificaciones se publicarán en este mismo sitio y entrarán en vigor a partir de la fecha indicada.
            Le recomendamos revisar periódicamente este documento.
          </p>
        </div>

        <p>
          Si tiene preguntas sobre estos Términos o requiere asistencia, puede contactarnos en{' '}
          <a href="mailto:soporte@puntoventacrov.com" className="text-orange-600 underline">
            soporte@puntoventacrov.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
