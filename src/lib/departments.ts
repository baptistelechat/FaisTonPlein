import { calculateDistance } from './utils'

type DepartmentInfo = {
  code: string
  centroid: [number, number] // [lon, lat]
}

// Centroïdes approximatifs des départements français (lon, lat)
export const DEPARTMENTS: DepartmentInfo[] = [
  { code: '01', centroid: [5.34, 46.07] },   // Ain
  { code: '02', centroid: [3.56, 49.56] },   // Aisne
  { code: '03', centroid: [3.16, 46.33] },   // Allier
  { code: '04', centroid: [6.23, 44.09] },   // Alpes-de-Haute-Provence
  { code: '05', centroid: [6.35, 44.66] },   // Hautes-Alpes
  { code: '06', centroid: [7.18, 43.93] },   // Alpes-Maritimes
  { code: '07', centroid: [4.37, 44.74] },   // Ardèche
  { code: '08', centroid: [4.70, 49.64] },   // Ardennes
  { code: '09', centroid: [1.45, 42.97] },   // Ariège
  { code: '10', centroid: [4.09, 48.30] },   // Aube
  { code: '11', centroid: [2.41, 43.07] },   // Aude
  { code: '12', centroid: [2.80, 44.28] },   // Aveyron
  { code: '13', centroid: [5.37, 43.54] },   // Bouches-du-Rhône
  { code: '14', centroid: [-0.37, 49.09] },  // Calvados
  { code: '15', centroid: [2.63, 45.05] },   // Cantal
  { code: '16', centroid: [0.18, 45.68] },   // Charente
  { code: '17', centroid: [-0.91, 45.73] },  // Charente-Maritime
  { code: '18', centroid: [2.49, 47.06] },   // Cher
  { code: '19', centroid: [1.93, 45.37] },   // Corrèze
  { code: '2A', centroid: [9.04, 41.86] },   // Corse-du-Sud
  { code: '2B', centroid: [9.28, 42.41] },   // Haute-Corse
  { code: '21', centroid: [4.77, 47.42] },   // Côte-d'Or
  { code: '22', centroid: [-2.93, 48.46] },  // Côtes-d'Armor
  { code: '23', centroid: [2.04, 46.07] },   // Creuse
  { code: '24', centroid: [0.73, 45.14] },   // Dordogne
  { code: '25', centroid: [6.35, 47.13] },   // Doubs
  { code: '26', centroid: [5.22, 44.69] },   // Drôme
  { code: '27', centroid: [1.22, 49.07] },   // Eure
  { code: '28', centroid: [1.26, 48.44] },   // Eure-et-Loir
  { code: '29', centroid: [-4.01, 48.24] },  // Finistère
  { code: '30', centroid: [4.16, 44.00] },   // Gard
  { code: '31', centroid: [1.42, 43.39] },   // Haute-Garonne
  { code: '32', centroid: [0.59, 43.69] },   // Gers
  { code: '33', centroid: [-0.58, 44.77] },  // Gironde
  { code: '34', centroid: [3.47, 43.61] },   // Hérault
  { code: '35', centroid: [-1.66, 48.15] },  // Ille-et-Vilaine
  { code: '36', centroid: [1.57, 46.68] },   // Indre
  { code: '37', centroid: [0.68, 47.25] },   // Indre-et-Loire
  { code: '38', centroid: [5.56, 45.30] },   // Isère
  { code: '39', centroid: [5.70, 46.77] },   // Jura
  { code: '40', centroid: [-0.79, 43.94] },  // Landes
  { code: '41', centroid: [1.34, 47.60] },   // Loir-et-Cher
  { code: '42', centroid: [4.14, 45.66] },   // Loire
  { code: '43', centroid: [3.81, 45.07] },   // Haute-Loire
  { code: '44', centroid: [-1.68, 47.38] },  // Loire-Atlantique
  { code: '45', centroid: [2.42, 47.92] },   // Loiret
  { code: '46', centroid: [1.66, 44.60] },   // Lot
  { code: '47', centroid: [0.46, 44.36] },   // Lot-et-Garonne
  { code: '48', centroid: [3.51, 44.50] },   // Lozère
  { code: '49', centroid: [-0.55, 47.38] },  // Maine-et-Loire
  { code: '50', centroid: [-1.37, 49.07] },  // Manche
  { code: '51', centroid: [4.17, 48.96] },   // Marne
  { code: '52', centroid: [5.32, 48.09] },   // Haute-Marne
  { code: '53', centroid: [-0.60, 48.15] },  // Mayenne
  { code: '54', centroid: [6.16, 48.77] },   // Meurthe-et-Moselle
  { code: '55', centroid: [5.36, 49.02] },   // Meuse
  { code: '56', centroid: [-2.83, 47.86] },  // Morbihan
  { code: '57', centroid: [6.75, 49.02] },   // Moselle
  { code: '58', centroid: [3.52, 47.09] },   // Nièvre
  { code: '59', centroid: [3.21, 50.53] },   // Nord
  { code: '60', centroid: [2.44, 49.41] },   // Oise
  { code: '61', centroid: [0.19, 48.61] },   // Orne
  { code: '62', centroid: [2.37, 50.51] },   // Pas-de-Calais
  { code: '63', centroid: [3.07, 45.72] },   // Puy-de-Dôme
  { code: '64', centroid: [-0.61, 43.28] },  // Pyrénées-Atlantiques
  { code: '65', centroid: [0.17, 43.08] },   // Hautes-Pyrénées
  { code: '66', centroid: [2.55, 42.60] },   // Pyrénées-Orientales
  { code: '67', centroid: [7.55, 48.58] },   // Bas-Rhin
  { code: '68', centroid: [7.26, 47.85] },   // Haut-Rhin
  { code: '69', centroid: [4.65, 45.79] },   // Rhône
  { code: '70', centroid: [6.06, 47.64] },   // Haute-Saône
  { code: '71', centroid: [4.53, 46.64] },   // Saône-et-Loire
  { code: '72', centroid: [0.20, 47.99] },   // Sarthe
  { code: '73', centroid: [6.40, 45.50] },   // Savoie
  { code: '74', centroid: [6.40, 45.97] },   // Haute-Savoie
  { code: '75', centroid: [2.35, 48.86] },   // Paris
  { code: '76', centroid: [0.99, 49.69] },   // Seine-Maritime
  { code: '77', centroid: [2.94, 48.62] },   // Seine-et-Marne
  { code: '78', centroid: [1.79, 48.78] },   // Yvelines
  { code: '79', centroid: [-0.31, 46.57] },  // Deux-Sèvres
  { code: '80', centroid: [2.28, 49.96] },   // Somme
  { code: '81', centroid: [2.21, 43.79] },   // Tarn
  { code: '82', centroid: [1.35, 44.07] },   // Tarn-et-Garonne
  { code: '83', centroid: [6.16, 43.46] },   // Var
  { code: '84', centroid: [5.27, 43.97] },   // Vaucluse
  { code: '85', centroid: [-1.38, 46.70] },  // Vendée
  { code: '86', centroid: [0.47, 46.57] },   // Vienne
  { code: '87', centroid: [1.27, 45.84] },   // Haute-Vienne
  { code: '88', centroid: [6.41, 48.16] },   // Vosges
  { code: '89', centroid: [3.57, 47.80] },   // Yonne
  { code: '90', centroid: [6.87, 47.63] },   // Territoire de Belfort
  { code: '91', centroid: [2.29, 48.50] },   // Essonne
  { code: '92', centroid: [2.22, 48.82] },   // Hauts-de-Seine
  { code: '93', centroid: [2.47, 48.91] },   // Seine-Saint-Denis
  { code: '94', centroid: [2.47, 48.78] },   // Val-de-Marne
  { code: '95', centroid: [2.14, 49.07] },   // Val-d'Oise
  { code: '971', centroid: [-61.55, 16.25] }, // Guadeloupe
  { code: '972', centroid: [-61.00, 14.65] }, // Martinique
  { code: '973', centroid: [-53.20, 3.93] },  // Guyane
  { code: '974', centroid: [55.52, -21.13] }, // La Réunion
  { code: '976', centroid: [45.15, -12.83] }, // Mayotte
]

// Buffer conservateur = demi-étendue max d'un dépt métropolitain (Gironde ~56km → 65km de sécurité)
const DEPT_BUFFER_KM = 65

/**
 * Retourne les codes des départements dont le centroïde est à moins de
 * (radiusKm + DEPT_BUFFER_KM) du centre donné.
 * Garantit d'inclure tout département qui pourrait intersecter le cercle.
 */
export function getDepartmentsInRadius(
  center: [number, number], // [lon, lat]
  radiusKm: number,
): string[] {
  return DEPARTMENTS.filter((dept) => {
    const dist = calculateDistance(
      center[1],
      center[0],
      dept.centroid[1],
      dept.centroid[0],
    )
    return dist < radiusKm + DEPT_BUFFER_KM
  }).map((dept) => dept.code)
}
