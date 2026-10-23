import { getWeatherSnapshot } from '@/lib/weather/snapshot'

export const revalidate = 600

export default async function Page() {
  const { now } = await getWeatherSnapshot()

  return (
    <main>
      <p>WINIFREDA, LA PAMPA</p>
      {now ? (
        <>
          <p>{Math.round(now.tempC)}°</p>
          <dl>
            <dt>Sensación</dt>
            <dd>{Math.round(now.feelsC)}°</dd>
            <dt>Humedad</dt>
            <dd>{Math.round(now.humidityPct)} %</dd>
            <dt>Presión</dt>
            <dd>{Math.round(now.pressureHpa)} hPa</dd>
            <dt>Viento</dt>
            <dd>
              {Math.round(now.windKmh)} km/h, {Math.round(now.windDirDeg)}°
            </dd>
            <dt>Ráfagas</dt>
            <dd>{Math.round(now.gustKmh)} km/h</dd>
          </dl>
        </>
      ) : (
        <p>Ahora no tenemos el tiempo de Winifreda.</p>
      )}
    </main>
  )
}
