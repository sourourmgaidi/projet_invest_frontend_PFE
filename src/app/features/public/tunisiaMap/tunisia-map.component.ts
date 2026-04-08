// tunisia-map.component.ts
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { HttpClient } from '@angular/common/http';
import { StatsService } from '../../../core/services/stats.service';
import { RegionStats } from '../../../shared/models/region-stats.model';

@Component({
  selector: 'app-tunisia-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tunisia-map.component.html',
  styleUrls: ['./tunisia-map.component.css']
})
export class TunisiaMapComponent implements OnInit {
  @ViewChild('mapSvg', { static: true }) mapSvg!: ElementRef;

  selectedRegion: RegionStats | null = null;
  loading = true;
  private regions: RegionStats[] = [];
  private selectedPath: SVGPathElement | null = null;

  constructor(private http: HttpClient, private statsService: StatsService) {}

  ngOnInit(): void {
    Promise.all([
      this.loadGeoJson(),
      this.statsService.getRegionStats().toPromise()
    ]).then(([geoData, statsData]) => {
      this.regions = statsData || [];
      this.drawMap(geoData);
      this.loading = false;
    }).catch((error) => {
      console.error('Erreur:', error);
      this.loading = false;
    });
  }

  private async loadGeoJson(): Promise<any> {
    // Essayer plusieurs sources
    const urls = [
      'assets/data/tunisia-governorates.json',
      'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/tunisia/tunisia-governorates.json'
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn(`Échec chargement ${url}`);
      }
    }
    throw new Error('Impossible de charger la carte');
  }

  private drawMap(topoData: any): void {
    const svg = d3.select(this.mapSvg.nativeElement);
    const W = 300, H = 520;

    const geojson = this.topoToGeo(topoData);
    const projection = d3.geoMercator().fitSize([W, H], geojson);
    const pathGen = d3.geoPath().projection(projection);

    // 🔥 CRÉER UNE ÉCHELLE DE COULEURS DYNAMIQUE
    // Trouver le min et max de services totaux
    const totalServices = this.regions.map(r => r.totalApprovedServices);
    const maxServices = Math.max(...totalServices, 1); // Éviter division par zéro
    const minServices = Math.min(...totalServices, 0);

    // Échelle de couleurs (du vert clair au rouge foncé)
    const colorScale = d3.scaleSequential()
      .domain([minServices, maxServices])
      .interpolator(d3.interpolateRdYlGn); // Rouge (faible) → Vert (élevé)
    
    // Alternative : échelle de bleu (plus professionnelle)
    // const colorScale = d3.scaleSequential()
    //   .domain([minServices, maxServices])
    //   .interpolator(d3.interpolateBlues);

    svg.selectAll('path')
      .data(geojson.features)
      .enter()
      .append('path')
      .attr('d', (d: any) => pathGen(d) || '')
      .attr('class', 'region-path')
      .attr('data-region', (d: any) => {
        const name = d.properties?.name_1 || d.properties?.NAME_1 || d.properties?.name || '';
        return name;
      })
      // 🎨 APPLIQUER LA COULEUR SELON LE NOMBRE DE SERVICES
      .attr('fill', (d: any) => {
        const name = d.properties?.name_1 || d.properties?.NAME_1 || d.properties?.name || '';
        const regionData = this.regions.find(r => 
          r.name === name || name.includes(r.name) || r.name.includes(name)
        );
        
        if (regionData) {
          const value = regionData.totalApprovedServices;
          // Retourner la couleur selon l'échelle
          return colorScale(value);
        }
        return '#e0e0e0'; // Couleur par défaut (gris si pas de données)
      })
      .on('click', (event: any, d: any) => {
        const name = d.properties?.name_1 || d.properties?.NAME_1 || d.properties?.name || '';
        this.onRegionClick(name, event.target);
      })
      .on('mouseenter', function(this: SVGPathElement, event: any, d: any) {
        if (!this.classList.contains('selected')) {
          // Au survol, assombrir légèrement la couleur
          const currentFill = d3.select(this).attr('fill');
          d3.select(this).style('filter', 'brightness(0.9)');
        }
      })
      .on('mouseleave', function(this: SVGPathElement, event: any, d: any) {
        if (!this.classList.contains('selected')) {
          d3.select(this).style('filter', null);
        }
      });

    // Ajouter une légende des couleurs
    this.addLegend(svg, colorScale, minServices, maxServices);

    // Labels des régions
    svg.selectAll('text')
      .data(geojson.features)
      .enter()
      .append('text')
      .attr('x', (d: any) => pathGen.centroid(d)[0])
      .attr('y', (d: any) => pathGen.centroid(d)[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', '6px')
      .style('fill', '#1e3a5f')
      .style('pointer-events', 'none')
      .style('font-weight', 'bold')
      .style('text-shadow', '1px 1px 0 white')
      .text((d: any) => {
        const n = d.properties?.name_1 || d.properties?.name || '';
        return n.length > 9 ? n.substring(0, 8) + '.' : n;
      });
  }

  // 📊 AJOUTER UNE LÉGENDE EXPLICATIVE
  private addLegend(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
                    colorScale: d3.ScaleSequential<string>, 
                    minVal: number, 
                    maxVal: number): void {
    
    const legendWidth = 120;
    const legendHeight = 15;
    const legendX = 10;
    const legendY = 470;

    // Créer un dégradé pour la légende
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    // Ajouter les stops de couleur
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const value = minVal + t * (maxVal - minVal);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    // Dessiner la barre de légende
    svg.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)')
      .style('stroke', '#333')
      .style('stroke-width', '1px');

    // Ajouter les labels min et max
    svg.append('text')
      .attr('x', legendX)
      .attr('y', legendY - 5)
      .attr('text-anchor', 'start')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(`${Math.round(minVal)} services`);

    svg.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY - 5)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(`${Math.round(maxVal)} services`);

    // Titre de la légende
    svg.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 12)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text('Nombre de services');
  }

  private onRegionClick(name: string, el: SVGPathElement): void {
    if (this.selectedPath) {
      this.selectedPath.classList.remove('selected');
      d3.select(this.selectedPath).style('stroke', null);
    }
    this.selectedPath = el;
    el.classList.add('selected');
    d3.select(el).style('stroke', '#ff6b6b').style('stroke-width', '3px');

    const found = this.regions.find(r =>
      r.name === name || name.includes(r.name) || r.name.includes(name)
    );
    
    if (found) {
      this.selectedRegion = found;
    } else {
      this.selectedRegion = {
        name: name,
        geographicalZone: '',
        economicDescription: 'Aucune donnée disponible pour cette région',
        taxIncentives: '',
        infrastructure: '',
        approvedInvestmentServices: 0,
        approvedCollaborationServices: 0,
        approvedTouristServices: 0,
        totalApprovedServices: 0,
        id: 0,
        code: ''
      };
    }
  }

  closePanel(): void {
    if (this.selectedPath) {
      this.selectedPath.classList.remove('selected');
      d3.select(this.selectedPath).style('stroke', null);
      this.selectedPath = null;
    }
    this.selectedRegion = null;
  }

  private topoToGeo(topo: any): any {
    const obj = Object.values(topo.objects)[0] as any;
    const scale = topo.transform?.scale || [1,1];
    const translate = topo.transform?.translate || [0,0];

    const decodeArc = (arc: number[][]) => {
      let x = 0, y = 0;
      return arc.map(([dx, dy]) => [x += dx, y += dy]
        .map((v, i) => v * scale[i] + translate[i]));
    };

    const getArc = (i: number) => i < 0
      ? decodeArc(topo.arcs[~i]).reverse()
      : decodeArc(topo.arcs[i]);

    const buildRing = (ring: number[]) =>
      ring.flatMap((i, idx) => idx === 0 ? getArc(i) : getArc(i).slice(1));

    return {
      type: 'FeatureCollection',
      features: obj.geometries.map((g: any) => ({
        type: 'Feature',
        properties: g.properties || {},
        geometry: {
          type: g.type,
          coordinates: g.type === 'Polygon'
            ? g.arcs.map(buildRing)
            : g.arcs.map((p: any) => p.map(buildRing))
        }
      }))
    };
  }
}