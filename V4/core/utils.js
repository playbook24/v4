/**
 * core/utils.js
 * Utilitaires partagés (Coordonnées, Bézier, Couleurs, Animation).
 * Fusion V3/V4 pour restaurer la vidéo, l'animation et le responsive.
 */

window.ORB = window.ORB || {};

window.ORB.utils = {
    
    // --- COORDONNÉES ÉCRAN ET SOURIS (Adapté V4 Demi-terrain) ---

    getPixelCoords: function(logicalPos) {
        if (!window.ORB.canvas) return logicalPos;
        const CONSTANTS = window.ORB.CONSTANTS || { LOGICAL_WIDTH: 280, LOGICAL_HEIGHT: 150 };
        const rect = window.ORB.canvas.getBoundingClientRect();
        const isHalf = document.body.classList.contains('view-half-court');
        const viewWidth = isHalf ? (CONSTANTS.LOGICAL_WIDTH / 2) : CONSTANTS.LOGICAL_WIDTH;
        
        return {
            x: (logicalPos.x / viewWidth) * rect.width,
            y: (logicalPos.y / CONSTANTS.LOGICAL_HEIGHT) * rect.height
        };
    },

    getLogicalCoords: function(event, customRect, customViewWidth) {
        const canvas = window.ORB.canvas;
        const CONSTANTS = window.ORB.CONSTANTS || { LOGICAL_WIDTH: 280, LOGICAL_HEIGHT: 150 };
        const rect = customRect || (canvas ? canvas.getBoundingClientRect() : {left: 0, top: 0, width: 800, height: 428});
        
        let clientX = event.clientX;
        let clientY = event.clientY;
        
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        const pixelX = clientX - rect.left;
        const pixelY = clientY - rect.top;
        
        const isHalf = document.body.classList.contains('view-half-court');
        const viewWidth = customViewWidth || (isHalf ? (CONSTANTS.LOGICAL_WIDTH / 2) : CONSTANTS.LOGICAL_WIDTH);
        
        return {
            x: (pixelX / rect.width) * viewWidth,
            y: (pixelY / rect.height) * CONSTANTS.LOGICAL_HEIGHT
        };
    },

    // --- COORDONNÉES SPÉCIFIQUES POUR L'ANIMATION / VIDÉO ---

    getAnimPixelCoords: function(logicalPos, customRect = null, p_animationState) {
        const animCanvas = window.ORB.animCanvas;
        const CONSTANTS = window.ORB.CONSTANTS || { LOGICAL_WIDTH: 280, LOGICAL_HEIGHT: 150 };
        const state = p_animationState || window.ORB.animationState;
        
        const rect = customRect || (animCanvas ? animCanvas.getBoundingClientRect() : {width: 800, height: 428});
        const viewWidth = (state.view === 'half') ? (CONSTANTS.LOGICAL_WIDTH / 2) : CONSTANTS.LOGICAL_WIDTH;
        
        let transformedX = logicalPos.x;
        // Décalage si l'action se passe sur la partie droite du demi-terrain
        if (state.view === 'half' && state.activeHalf === 'right') {
            transformedX -= (CONSTANTS.LOGICAL_WIDTH / 2);
        }

        return {
            x: (transformedX / viewWidth) * rect.width,
            y: (logicalPos.y / CONSTANTS.LOGICAL_HEIGHT) * rect.height
        };
    },

    // --- MATHÉMATIQUES & GÉOMÉTRIE (Restauration V3) ---

    getDistanceToSegment: function(p, v, w) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return Math.hypot(p.x - projection.x, p.y - projection.y);
    },

    getQuadraticBezierPoint: function(t, p0, p1, p2) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const x = uu * p0.x + 2 * u * t * p1.x + tt * p2.x;
        const y = uu * p0.y + 2 * u * t * p1.y + tt * p2.y;
        return { x, y };
    },

    subdividePath: function(points) {
        if (!points || points.length < 2) return points;
        const subdividedPoints = [];
        const numSteps = 20;
        subdividedPoints.push(points[0]);
        let p0 = points[0];
        for (let i = 1; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = { x: (points[i].x + points[i+1].x) / 2, y: (points[i].y + points[i+1].y) / 2 };
            for (let j = 1; j <= numSteps; j++) {
                const t = j / numSteps;
                subdividedPoints.push(this.getQuadraticBezierPoint(t, p0, p1, p2));
            }
            p0 = p2;
        }
        subdividedPoints.push(points[points.length - 1]);
        return subdividedPoints;
    },
    
    getPathLength: function(pathPoints) {
        if (!pathPoints || pathPoints.length < 2) return 0;
        let totalLength = 0;
        for (let i = 0; i < pathPoints.length - 1; i++) {
            totalLength += Math.hypot(pathPoints[i+1].x - pathPoints[i].x, pathPoints[i+1].y - pathPoints[i].y);
        }
        return totalLength;
    },

    getPathSlice: function(points, progress) {
        if (!points || points.length < 2) return [];
        if (progress <= 0) return [points[0]];
        if (progress >= 1) return points;

        const totalLen = this.getPathLength(points);
        const targetLen = totalLen * progress;
        
        const slice = [points[0]];
        let currentLen = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (currentLen + segLen >= targetLen) {
                const remaining = targetLen - currentLen;
                const ratio = remaining / segLen;
                slice.push({
                    x: p1.x + (p2.x - p1.x) * ratio,
                    y: p1.y + (p2.y - p1.y) * ratio
                });
                break;
            } else {
                slice.push(p2);
                currentLen += segLen;
            }
        }
        return slice;
    },

    getPointOnPath: function(points, progress) {
        const slice = this.getPathSlice(points, progress);
        return slice[slice.length - 1];
    },

    // --- COULEURS ---

    hexToRgba: function(hex, alpha) {
        if (!hex || !hex.startsWith('#')) return `rgba(0,0,0,${alpha})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// ALIAS POUR LA RÉTROCOMPATIBILITÉ AVEC LE RESTE DE LA V4
window.ORB_UTILS = window.ORB.utils;