import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import mapboxgl from 'mapbox-gl';
import { StatsService } from '../../../core/services/stats.service';
import { RegionStats } from '../../../shared/models/region-stats.model';

@Component({
  selector: 'app-tunisia-mapbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tunisia-mapbox.component.html',
  styleUrls: ['./tunisia-mapbox.component.css']
})
export class TunisiaMapboxComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  private map!: mapboxgl.Map;
  private regions: RegionStats[] = [];
  loading = true;
  selectedRegion: RegionStats | null = null;
  
  private accessToken = 'pk.eyJ1Ijoic291cm91cm1nYWlkaSIsImEiOiJjbW54NG90MzQwMG93MnJzMjYxcjJ0YzQ5In0.URJDj_gPYCOWLSWeALFTag';

  constructor(
    private statsService: StatsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.statsService.getRegionStats().subscribe({
      next: (data) => {
        this.regions = data;
        this.loading = false;
        if (this.map && this.map.loaded()) {
          this.addTunisiaLayer();
        }
      },
      error: (err) => {
        console.error('Erreur chargement stats:', err);
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    mapboxgl.accessToken = this.accessToken;
    
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [9.5, 34.5],
      zoom: 6,
      pitch: 45,
      bearing: 0,
      antialias: true
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    this.map.on('load', () => {
      if (!this.loading) {
        this.addTunisiaLayer();
      }
      this.add3DTerrain();
    });
  }

  private add3DTerrain(): void {
    this.map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14
    });
    this.map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
  }

  private addTunisiaLayer(): void {
    if (!this.regions.length) return;

    const totalServices = this.regions.map(r => r.totalApprovedServices);
    const maxServices = Math.max(...totalServices, 1);
    const minServices = Math.min(...totalServices, 0);

    const colorExpression: mapboxgl.ExpressionSpecification = [
      'interpolate',
      ['linear'],
      ['get', 'totalServices'],
      minServices, '#2ecc71',
      minServices + (maxServices - minServices) * 0.25, '#27ae60',
      minServices + (maxServices - minServices) * 0.5, '#229954',
      minServices + (maxServices - minServices) * 0.75, '#1e8449',
      maxServices, '#145a32'
    ];

    const geojsonData = this.generateGeoJSON();

    if (!this.map.getSource('tunisia-governorates')) {
      this.map.addSource('tunisia-governorates', {
        type: 'geojson',
        data: geojsonData as any,
        generateId: true
      });
    }

    if (!this.map.getLayer('governorates-3d')) {
      this.map.addLayer({
        id: 'governorates-3d',
        type: 'fill-extrusion',
        source: 'tunisia-governorates',
        paint: {
          'fill-extrusion-color': colorExpression,
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['get', 'totalServices'],
            minServices, 0,
            maxServices, 200
          ] as mapboxgl.ExpressionSpecification,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9
        }
      });

      this.map.addLayer({
        id: 'governorates-outline',
        type: 'line',
        source: 'tunisia-governorates',
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      this.map.addLayer({
        id: 'governorates-labels',
        type: 'symbol',
        source: 'tunisia-governorates',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -1],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });
    }

    this.map.on('click', 'governorates-3d', (e) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties as any;
        const region = this.regions.find(r => r.name === properties?.['name']);
        if (region) {
          this.selectedRegion = region;
        }
      }
    });

    this.map.on('mouseenter', 'governorates-3d', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'governorates-3d', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  private generateGeoJSON(): any {
    const coordinates: { [key: string]: number[][] } = {
      'Tunis': [[10.1, 36.8], [10.2, 36.8], [10.2, 36.7], [10.1, 36.7], [10.1, 36.8]],
      'Ariana': [[10.15, 36.85], [10.25, 36.85], [10.25, 36.75], [10.15, 36.75], [10.15, 36.85]],
      'Ben Arous': [[10.25, 36.75], [10.35, 36.75], [10.35, 36.65], [10.25, 36.65], [10.25, 36.75]],
      'Manouba': [[9.95, 36.85], [10.05, 36.85], [10.05, 36.75], [9.95, 36.75], [9.95, 36.85]],
      'Nabeul': [[10.8, 36.5], [11.0, 36.5], [11.0, 36.3], [10.8, 36.3], [10.8, 36.5]],
      'Zaghouan': [[10.0, 36.4], [10.2, 36.4], [10.2, 36.2], [10.0, 36.2], [10.0, 36.4]],
      'Bizerte': [[9.7, 37.2], [10.0, 37.2], [10.0, 37.0], [9.7, 37.0], [9.7, 37.2]],
      'Béja': [[9.3, 36.9], [9.6, 36.9], [9.6, 36.7], [9.3, 36.7], [9.3, 36.9]],
      'Jendouba': [[8.6, 36.8], [8.9, 36.8], [8.9, 36.6], [8.6, 36.6], [8.6, 36.8]],
      'Kef': [[8.8, 36.2], [9.1, 36.2], [9.1, 36.0], [8.8, 36.0], [8.8, 36.2]],
      'Siliana': [[9.2, 36.1], [9.5, 36.1], [9.5, 35.9], [9.2, 35.9], [9.2, 36.1]],
      'Sousse': [[10.5, 35.9], [10.7, 35.9], [10.7, 35.7], [10.5, 35.7], [10.5, 35.9]],
      'Monastir': [[10.7, 35.8], [10.9, 35.8], [10.9, 35.6], [10.7, 35.6], [10.7, 35.8]],
      'Mahdia': [[11.0, 35.5], [11.2, 35.5], [11.2, 35.3], [11.0, 35.3], [11.0, 35.5]],
      'Sfax': [[10.7, 34.9], [11.0, 34.9], [11.0, 34.6], [10.7, 34.6], [10.7, 34.9]],
      'Kairouan': [[9.9, 35.7], [10.2, 35.7], [10.2, 35.4], [9.9, 35.4], [9.9, 35.7]],
      'Kasserine': [[8.6, 35.3], [9.0, 35.3], [9.0, 35.0], [8.6, 35.0], [8.6, 35.3]],
      'Sidi Bouzid': [[9.3, 35.1], [9.7, 35.1], [9.7, 34.8], [9.3, 34.8], [9.3, 35.1]],
      'Gabès': [[9.9, 34.0], [10.2, 34.0], [10.2, 33.7], [9.9, 33.7], [9.9, 34.0]],
      'Medenine': [[10.5, 33.5], [10.9, 33.5], [10.9, 33.2], [10.5, 33.2], [10.5, 33.5]],
      'Tataouine': [[10.1, 33.0], [10.5, 33.0], [10.5, 32.7], [10.1, 32.7], [10.1, 33.0]],
      'Gafsa': [[8.7, 34.5], [9.2, 34.5], [9.2, 34.2], [8.7, 34.2], [8.7, 34.5]],
      'Tozeur': [[7.9, 34.0], [8.3, 34.0], [8.3, 33.8], [7.9, 33.8], [7.9, 34.0]],
      'Kebili': [[8.8, 33.8], [9.3, 33.8], [9.3, 33.5], [8.8, 33.5], [8.8, 33.8]]
    };

    const features = this.regions.map(region => {
      const coords = coordinates[region.name] || coordinates['Tunis'];
      return {
        type: 'Feature',
        properties: {
          name: region.name,
          totalServices: region.totalApprovedServices,
          investmentServices: region.approvedInvestmentServices,
          collaborationServices: region.approvedCollaborationServices,
          touristServices: region.approvedTouristServices,
          economicDescription: region.economicDescription,
          infrastructure: region.infrastructure,
          taxIncentives: region.taxIncentives,
          geographicalZone: region.geographicalZone
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      };
    });

    return { type: 'FeatureCollection', features };
  }

  getPercentage(region: RegionStats): number {
    const max = Math.max(...this.regions.map(r => r.totalApprovedServices), 1);
    return (region.totalApprovedServices / max) * 100;
  }

  isValidField(value: string | null | undefined): boolean {
    return !!value && value !== 'NULL' && value.trim() !== '';
  }

  openRegionServicesPage(region: RegionStats): void {
    this.router.navigate(['/region-services', region.id]);
  }

  closePanel(): void {
    this.selectedRegion = null;
  }
}