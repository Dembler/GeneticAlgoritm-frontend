<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type {
  Point,
  RouteRequest,
  RouteResponse,
  RouteSegmentInsight,
} from '@/shared/api/route.types'
import { formatDuration, formatNumber } from '@/shared/lib/format/number'
import { translateBackendText } from '@/shared/lib/format/routePresentation'

const draft = defineModel<RouteRequest | null>('draft', { required: true })

const props = defineProps<{
  result: RouteResponse | null
  selectedAlternativeRank: number | null
}>()
const { t } = useI18n({ useScope: 'global' })

const RISK_HIGHLIGHT_THRESHOLD = 0.55
const RISK_HIGHLIGHT_LIMIT = 4

type LayerKind = 'optimized' | 'baseline' | 'alternative' | 'cvrp' | 'draft'

type RouteLayer = {
  id: string
  kind: LayerKind
  geometry: number[][]
  label: string
}

type MarkerPoint = {
  point: Point
  routeOrder: number
  sourceOrder: number | null
}

const mapElement = shallowRef<HTMLDivElement | null>(null)
const map = shallowRef<L.Map | null>(null)
const markerLayer = shallowRef<L.LayerGroup | null>(null)
const routeLayerGroup = shallowRef<L.LayerGroup | null>(null)
const resizeObserver = shallowRef<ResizeObserver | null>(null)
const fitTimer = shallowRef<number | null>(null)

const selectedAlternative = computed(
  () =>
    props.result?.alternatives.find(
      (alternative) => alternative.rank === props.selectedAlternativeRank,
    ) ?? null,
)

const routeLayers = computed<RouteLayer[]>(() => {
  const layers: RouteLayer[] = []

  if (props.result?.comparison?.baseline_geometry?.length) {
    layers.push({
      id: 'baseline',
      kind: 'baseline',
      geometry: props.result.comparison.baseline_geometry,
      label: t('analysis.baselineRoute'),
    })
  }

  if (props.result?.geometry?.length) {
    layers.push({
      id: 'optimized',
      kind: 'optimized',
      geometry: props.result.geometry,
      label: t('analysis.selectedRoute'),
    })
  }

  if (selectedAlternative.value?.geometry?.length) {
    layers.push({
      id: `alternative-${selectedAlternative.value.rank}`,
      kind: 'alternative',
      geometry: selectedAlternative.value.geometry,
      label: t('analysis.alternative', { rank: selectedAlternative.value.rank }),
    })
  }

  if (props.result?.cvrp_plan?.enabled) {
    props.result.cvrp_plan.routes.forEach((vehicleRoute) => {
      if (vehicleRoute.geometry.length) {
        layers.push({
          id: `vehicle-${vehicleRoute.vehicle_index}`,
          kind: 'cvrp',
          geometry: vehicleRoute.geometry,
          label: t('map.vehicle', { number: vehicleRoute.vehicle_index + 1 }),
        })
      }
    })
  }

  if (!layers.length && draft.value?.points.length) {
    layers.push({
      id: 'draft',
      kind: 'draft',
      geometry: draft.value.points.map((point) => [point.lat, point.lon]),
      label: t('map.draftRoute'),
    })
  }

  return layers
})

const activeMarkerGeometry = computed(() => {
  if (selectedAlternative.value?.geometry?.length) {
    return selectedAlternative.value.geometry
  }

  return props.result?.geometry ?? []
})

const activeMarkerSourcePoints = computed(() => {
  if (selectedAlternative.value?.ordered_points.length) {
    return selectedAlternative.value.ordered_points
  }

  if (props.result?.ordered_points.length) {
    return props.result.ordered_points
  }

  return draft.value?.points ?? []
})

const hasResultRoute = computed(() => Boolean(props.result?.ordered_points.length))

const routeLegend = computed(() => {
  const comparison = props.result?.comparison
  const optimizedMetrics = props.result?.metrics ?? comparison?.optimized_metrics ?? null
  const baselineMetrics = comparison?.baseline_metrics ?? null

  return {
    hasBaseline: Boolean(comparison?.baseline_geometry?.length),
    hasOptimized: Boolean(props.result?.geometry?.length),
    baseline: baselineMetrics
      ? `${formatNumber(baselineMetrics.distance_km, 0)} ${t('route.units.kilometer')} / ${formatDuration(baselineMetrics.duration_min)}`
      : null,
    optimized: optimizedMetrics
      ? `${formatNumber(optimizedMetrics.distance_km, 0)} ${t('route.units.kilometer')} / ${formatDuration(optimizedMetrics.duration_min)}`
      : null,
  }
})

const riskInsights = computed(() =>
  (props.result?.segment_insights ?? [])
    .filter(
      (insight) => insight.is_problematic ?? insight.severity_score >= RISK_HIGHLIGHT_THRESHOLD,
    )
    .sort((first, second) => second.severity_score - first.severity_score)
    .slice(0, RISK_HIGHLIGHT_LIMIT),
)

const markerLegendText = computed(() => {
  if (selectedAlternative.value) {
    return t('map.markerLegendAlternative')
  }

  if (props.result?.geometry?.length) {
    return t('map.markerLegendSelected')
  }

  return t('map.markerLegendDraft')
})

function distanceSquared(point: Point, coordinate: number[]) {
  const lat = coordinate[0] ?? 0
  const lon = coordinate[1] ?? 0

  return (point.lat - lat) ** 2 + (point.lon - lon) ** 2
}

function nearestGeometryIndex(point: Point, geometry: number[][]) {
  if (!geometry.length) {
    return -1
  }

  return geometry.reduce(
    (best, coordinate, index) => {
      const distance = distanceSquared(point, coordinate)

      return distance < best.distance ? { distance, index } : best
    },
    { distance: Number.POSITIVE_INFINITY, index: 0 },
  ).index
}

function geometryForRiskInsight(insight: RouteSegmentInsight, result: RouteResponse) {
  const geometry = result.geometry
  const start = result.ordered_points[insight.start_index]
  const end = result.ordered_points[insight.end_index]

  if (!start || !end || geometry.length < 2) {
    return []
  }

  const startIndex = nearestGeometryIndex(start, geometry)
  const endIndex = nearestGeometryIndex(end, geometry)

  if (startIndex < 0 || endIndex < 0 || startIndex === endIndex) {
    return []
  }

  const from = Math.min(startIndex, endIndex)
  const to = Math.max(startIndex, endIndex)
  const segmentGeometry = geometry.slice(from, to + 1)

  return startIndex <= endIndex ? segmentGeometry : [...segmentGeometry].reverse()
}

function middleCoordinate(geometry: number[][]) {
  if (geometry.length === 2) {
    const [start, end] = geometry

    return [((start?.[0] ?? 0) + (end?.[0] ?? 0)) / 2, ((start?.[1] ?? 0) + (end?.[1] ?? 0)) / 2]
  }

  return geometry[Math.floor(geometry.length / 2)] ?? null
}

function riskInsightColor(insight: RouteSegmentInsight) {
  if (insight.map_color_hex) {
    return insight.map_color_hex
  }

  return insight.severity_score >= 0.7 ? 'hsl(18 90% 52%)' : 'hsl(36 92% 50%)'
}

function sourcePointIndex(point: Point) {
  const sourcePoints = draft.value?.points ?? []
  const coordinateIndex = sourcePoints.findIndex(
    (sourcePoint) =>
      Math.abs(sourcePoint.lat - point.lat) < 0.00001 &&
      Math.abs(sourcePoint.lon - point.lon) < 0.00001,
  )

  if (coordinateIndex >= 0) {
    return coordinateIndex
  }

  const labelIndex = sourcePoints.findIndex((sourcePoint) =>
    Boolean(sourcePoint.label && sourcePoint.label === point.label),
  )

  if (labelIndex >= 0) {
    return labelIndex
  }

  const nearest = sourcePoints.reduce(
    (best, sourcePoint, index) => {
      const distance = (sourcePoint.lat - point.lat) ** 2 + (sourcePoint.lon - point.lon) ** 2

      return distance < best.distance ? { distance, index } : best
    },
    { distance: Number.POSITIVE_INFINITY, index: -1 },
  )

  return nearest.distance < 0.0001 ? nearest.index : -1
}

const markerPoints = computed<MarkerPoint[]>(() => {
  const geometry = activeMarkerGeometry.value
  const points = activeMarkerSourcePoints.value
  const orderedPoints = geometry.length
    ? [...points].sort((firstPoint, secondPoint) => {
        return (
          nearestGeometryIndex(firstPoint, geometry) - nearestGeometryIndex(secondPoint, geometry)
        )
      })
    : points

  return orderedPoints.map((point, index) => {
    const sourceIndex = sourcePointIndex(point)

    return {
      point,
      routeOrder: index + 1,
      sourceOrder: sourceIndex >= 0 ? sourceIndex + 1 : null,
    }
  })
})

function createMarkerIcon(markerPoint: MarkerPoint, isResultPoint: boolean) {
  const sourceBadge =
    markerPoint.sourceOrder && markerPoint.sourceOrder !== markerPoint.routeOrder
      ? `<small>${t('map.sourceShort')} ${markerPoint.sourceOrder}</small>`
      : ''

  return L.divIcon({
    className: 'route-marker-icon',
    html: `<span class="route-marker-icon__inner route-marker-icon__inner--tone-${(markerPoint.routeOrder - 1) % 4} ${isResultPoint ? 'route-marker-icon__inner--result' : ''}"><strong>${markerPoint.routeOrder}</strong>${sourceBadge}</span>`,
    iconSize: [44, 36],
    iconAnchor: [22, 18],
  })
}

function layerStyle(kind: LayerKind): L.PolylineOptions {
  if (kind === 'baseline') {
    return {
      color: 'hsl(220 12% 42%)',
      dashArray: '8 12',
      opacity: 0.82,
      weight: 5,
    }
  }

  if (kind === 'alternative') {
    return {
      color: 'hsl(262 75% 56%)',
      opacity: 0.88,
      weight: 5,
    }
  }

  if (kind === 'cvrp') {
    return {
      color: 'hsl(31 92% 50%)',
      opacity: 0.86,
      weight: 4,
    }
  }

  if (kind === 'draft') {
    return {
      color: 'hsl(208 76% 45%)',
      dashArray: '4 10',
      opacity: 0.86,
      weight: 4,
    }
  }

  return {
    color: 'hsl(164 76% 30%)',
    opacity: 0.96,
    weight: 7,
  }
}

function addPointAt(latlng: L.LatLng) {
  if (!draft.value) {
    return
  }

  const insertIndex =
    draft.value.points.length > 1 ? draft.value.points.length - 1 : draft.value.points.length
  draft.value.points.splice(insertIndex, 0, {
    label: t('analysis.point', { number: insertIndex + 1 }),
    lat: Number(latlng.lat.toFixed(6)),
    lon: Number(latlng.lng.toFixed(6)),
  })
}

function updateDraftPoint(index: number, latlng: L.LatLng) {
  const point = draft.value?.points[index]

  if (!point) {
    return
  }

  point.lat = Number(latlng.lat.toFixed(6))
  point.lon = Number(latlng.lng.toFixed(6))
}

function renderMarkers() {
  if (!map.value || !markerLayer.value) {
    return
  }

  markerLayer.value.clearLayers()

  const isResultPoint = hasResultRoute.value

  markerPoints.value.forEach((markerPoint, index) => {
    const marker = L.marker([markerPoint.point.lat, markerPoint.point.lon], {
      draggable: !isResultPoint,
      icon: createMarkerIcon(markerPoint, isResultPoint),
      riseOnHover: true,
    })

    const tooltipParts = [
      t('map.routeOrder', { number: markerPoint.routeOrder }),
      markerPoint.sourceOrder ? t('map.sourceOrder', { number: markerPoint.sourceOrder }) : null,
      markerPoint.point.label,
    ].filter(Boolean)

    marker.bindTooltip(tooltipParts.join(' · ') || t('analysis.point', { number: index + 1 }), {
      direction: 'top',
      offset: [0, -12],
      opacity: 0.96,
    })

    marker.on('dragend', () => updateDraftPoint(index, marker.getLatLng()))
    marker.addTo(markerLayer.value as L.LayerGroup)
  })
}

function renderRoutes() {
  if (!routeLayerGroup.value) {
    return
  }

  routeLayerGroup.value.clearLayers()

  routeLayers.value.forEach((layer) => {
    if (layer.geometry.length < 2) {
      return
    }

    const polyline = L.polyline(
      layer.geometry.map((coordinate) => [coordinate[0] ?? 0, coordinate[1] ?? 0]),
      layerStyle(layer.kind),
    )

    polyline.bindTooltip(layer.label, {
      sticky: true,
      opacity: 0.96,
    })
    polyline.addTo(routeLayerGroup.value as L.LayerGroup)
  })

  renderRiskSegments()
}

function renderRiskSegments() {
  const group = routeLayerGroup.value
  const result = props.result

  if (!group || !result?.ordered_points.length || !riskInsights.value.length) {
    return
  }

  riskInsights.value.forEach((insight) => {
    const segmentGeometry = geometryForRiskInsight(insight, result)

    if (segmentGeometry.length < 2) {
      return
    }

    const color = riskInsightColor(insight)
    const coordinates = segmentGeometry.map(
      (coordinate) => [coordinate[0] ?? 0, coordinate[1] ?? 0] satisfies L.LatLngExpression,
    )
    const weight = insight.map_stroke_weight ?? (insight.severity_score >= 0.7 ? 12 : 10)

    if (segmentGeometry.length >= 3) {
      L.polyline(coordinates, {
        color,
        dashArray: insight.map_dash_array ?? undefined,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: 0.42,
        weight,
      })
        .bindTooltip(
          `${translateBackendText(insight.dominant_factor_label)}: ${formatNumber(insight.severity_score * 100, 0)}%`,
          {
            sticky: true,
            opacity: 0.96,
          },
        )
        .addTo(group)
    }

    const midpoint = middleCoordinate(segmentGeometry)

    if (midpoint) {
      L.circleMarker([midpoint[0] ?? 0, midpoint[1] ?? 0], {
        color,
        fillColor: color,
        fillOpacity: 0.88,
        opacity: 1,
        radius: 6,
        weight: 2,
      })
        .bindTooltip(translateBackendText(insight.narrative), {
          direction: 'top',
          opacity: 0.96,
        })
        .addTo(group)
    }
  })
}

function fitToContent() {
  if (!map.value) {
    return
  }

  const coordinates = [
    ...routeLayers.value.flatMap((layer) => layer.geometry),
    ...markerPoints.value.map((markerPoint) => [markerPoint.point.lat, markerPoint.point.lon]),
  ].filter((coordinate) => Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))

  if (!coordinates.length) {
    map.value.setView([55.7558, 37.6173], 6)
    return
  }

  const bounds = L.latLngBounds(
    coordinates.map((coordinate) => [coordinate[0] ?? 0, coordinate[1] ?? 0]),
  )
  map.value.fitBounds(bounds.pad(0.2), {
    animate: false,
    maxZoom: 10,
    padding: [36, 36],
  })
}

function scheduleFitToContent() {
  if (fitTimer.value) {
    window.clearTimeout(fitTimer.value)
  }

  fitTimer.value = window.setTimeout(() => {
    map.value?.invalidateSize({ debounceMoveend: true })
    fitToContent()
    fitTimer.value = null
  }, 120)
}

function refreshMap({ fit = false } = {}) {
  renderRoutes()
  renderMarkers()

  if (fit) {
    void nextTick(() => scheduleFitToContent())
  }
}

onMounted(() => {
  if (!mapElement.value) {
    return
  }

  const leafletMap = markRaw(
    L.map(mapElement.value, {
      attributionControl: false,
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([55.7558, 37.6173], 6),
  )

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    crossOrigin: true,
  }).addTo(leafletMap)

  L.control
    .attribution({
      prefix: false,
      position: 'bottomright',
    })
    .addAttribution('&copy; OpenStreetMap')
    .addTo(leafletMap)

  markerLayer.value = markRaw(L.layerGroup().addTo(leafletMap))
  routeLayerGroup.value = markRaw(L.layerGroup().addTo(leafletMap))
  map.value = leafletMap

  leafletMap.on('click', (event: L.LeafletMouseEvent) => addPointAt(event.latlng))

  resizeObserver.value = markRaw(
    new ResizeObserver(() => {
      leafletMap.invalidateSize({ debounceMoveend: true })
      scheduleFitToContent()
    }),
  )
  resizeObserver.value.observe(mapElement.value)

  refreshMap({ fit: true })
})

onBeforeUnmount(() => {
  if (fitTimer.value) {
    window.clearTimeout(fitTimer.value)
  }

  resizeObserver.value?.disconnect()
  map.value?.remove()
})

watch(
  () => [
    draft.value?.points.map((point) => `${point.lat}:${point.lon}:${point.label}`).join('|'),
    props.result?.run_id,
    props.result?.provider,
    props.result?.geometry.length,
    props.result?.comparison?.baseline_geometry.length,
    props.result?.ordered_points
      .map((point) => `${point.lat}:${point.lon}:${point.label}`)
      .join('|'),
    props.selectedAlternativeRank,
  ],
  () => refreshMap({ fit: false }),
)

watch(
  () => [
    props.result?.run_id,
    props.result?.geometry.length,
    draft.value?.points.length,
    props.selectedAlternativeRank,
  ],
  () => refreshMap({ fit: true }),
)
</script>

<template>
  <div class="interactive-map-shell">
    <div ref="mapElement" class="interactive-map" />
    <div v-if="routeLegend.hasOptimized || routeLegend.hasBaseline" class="route-legend">
      <div v-if="routeLegend.hasOptimized" class="route-legend__row">
        <span class="route-legend__line route-legend__line--optimized" />
        <span class="route-legend__label">{{ t('analysis.selectedRoute') }}</span>
        <span v-if="routeLegend.optimized" class="route-legend__value">{{
          routeLegend.optimized
        }}</span>
      </div>
      <div v-if="routeLegend.hasBaseline" class="route-legend__row">
        <span class="route-legend__line route-legend__line--baseline" />
        <span class="route-legend__label">{{ t('analysis.baselineRoute') }}</span>
        <span v-if="routeLegend.baseline" class="route-legend__value">{{
          routeLegend.baseline
        }}</span>
      </div>
      <div v-if="riskInsights.length" class="route-legend__risk">
        <div class="route-legend__risk-title">{{ t('map.problemSegments') }}</div>
        <div
          v-for="insight in riskInsights"
          :key="insight.narrative"
          class="route-legend__risk-row"
        >
          <span class="route-legend__risk-dot" :style="{ backgroundColor: insight.color_hex }" />
          <span class="route-legend__label">
            {{ insight.start_label }} -> {{ insight.end_label }}
          </span>
          <span class="route-legend__value">{{
            translateBackendText(insight.dominant_factor_label)
          }}</span>
        </div>
      </div>
      <div v-if="hasResultRoute" class="route-legend__note">
        {{ markerLegendText }}
      </div>
    </div>
    <div v-if="!hasResultRoute" class="map-help">
      {{ t('map.help') }}
    </div>
  </div>
</template>

<style scoped>
.interactive-map-shell {
  position: absolute;
  inset: var(--route-map-inset, 0);
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
  background: var(--muted);
}

.interactive-map {
  width: 100%;
  height: 100%;
}

.interactive-map :deep(.leaflet-tile-pane) {
  filter: saturate(1.1) contrast(1.02) brightness(1.02);
}

.map-help {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 500;
  max-width: min(28rem, calc(100% - 2rem));
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in oklch, var(--card) 90%, transparent);
  padding: 0.5rem 0.875rem;
  color: var(--foreground);
  font-size: 0.75rem;
  line-height: 1rem;
  box-shadow: 0 10px 24px hsl(0 0% 0% / 0.08);
  backdrop-filter: blur(12px);
}

.route-legend {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 500;
  display: grid;
  min-width: min(24rem, calc(100% - 2rem));
  gap: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.875rem;
  background: color-mix(in oklch, var(--card) 90%, transparent);
  padding: 0.75rem;
  color: var(--foreground);
  font-size: 0.75rem;
  box-shadow: 0 10px 24px hsl(0 0% 0% / 0.08);
  backdrop-filter: blur(12px);
}

.route-legend__row {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.625rem;
}

.route-legend__line {
  height: 0;
  border-top: 5px solid var(--foreground);
  border-radius: 999px;
}

.route-legend__line--baseline {
  border-top-style: dashed;
  border-color: var(--muted-foreground);
}

.route-legend__label {
  min-width: 0;
  font-weight: 700;
}

.route-legend__value {
  color: var(--muted-foreground);
  white-space: nowrap;
}

.route-legend__note {
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
  color: var(--muted-foreground);
  line-height: 1rem;
}

.route-legend__risk {
  display: grid;
  gap: 0.375rem;
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
}

.route-legend__risk-title {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
}

.route-legend__risk-row {
  display: grid;
  grid-template-columns: 0.75rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
}

.route-legend__risk-dot {
  width: 0.625rem;
  height: 0.625rem;
  border: 1px solid var(--background);
  border-radius: 999px;
}

:deep(.leaflet-control-zoom) {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0.875rem;
  box-shadow: 0 12px 30px hsl(0 0% 0% / 0.08);
}

:deep(.leaflet-control-zoom a) {
  border: 0;
  background: color-mix(in oklch, var(--card) 88%, transparent);
  color: var(--foreground);
}

:deep(.leaflet-control-attribution) {
  border-radius: 999px 0 0 0;
  background: color-mix(in oklch, var(--card) 82%, transparent);
  color: var(--muted-foreground);
  font-size: 0.625rem;
}

:deep(.route-marker-icon) {
  border: 0;
  background: transparent;
}

:deep(.route-marker-icon__inner) {
  display: grid;
  min-width: 2.25rem;
  min-height: 2.25rem;
  place-items: center;
  border: 3px solid var(--background);
  border-radius: 999px;
  background: hsl(0 0% 14%);
  color: hsl(0 0% 100%);
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 10px 28px hsl(0 0% 0% / 0.24);
}

:deep(.route-marker-icon__inner strong) {
  font-size: 0.8125rem;
}

:deep(.route-marker-icon__inner small) {
  margin-top: -0.125rem;
  font-size: 0.5rem;
  font-weight: 600;
}

:deep(.route-marker-icon__inner--result),
:deep(.route-marker-icon__inner--tone-0),
:deep(.route-marker-icon__inner--tone-1),
:deep(.route-marker-icon__inner--tone-2),
:deep(.route-marker-icon__inner--tone-3) {
  background: hsl(0 0% 12%);
}

@media (max-width: 1180px) {
  .interactive-map-shell {
    position: absolute;
    inset: 0;
    min-height: 0;
    border-radius: 1rem;
  }
}

@media (max-width: 640px) {
  .interactive-map-shell {
    position: relative;
    inset: auto;
    min-height: 0;
    overflow: visible;
  }

  .interactive-map {
    height: 22rem;
    overflow: hidden;
    border-radius: 1rem;
  }

  .map-help {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    border-radius: 0.875rem;
  }

  .route-legend {
    position: static;
    min-width: 0;
    margin-top: 0.75rem;
    border-radius: 1rem;
    background: var(--card);
    backdrop-filter: none;
  }

  .route-legend__row {
    grid-template-columns: 2.5rem minmax(0, 1fr);
  }

  .route-legend__value {
    grid-column: 2;
    white-space: normal;
  }
}
</style>
