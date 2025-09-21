import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './test-performance-component.css';

// Complex interfaces for type safety
interface DataPoint {
  id: string;
  timestamp: number;
  value: number;
  category: 'primary' | 'secondary' | 'tertiary';
  metadata: {
    source: string;
    confidence: number;
    tags: string[];
    coordinates?: { x: number; y: number; z?: number };
  };
}

interface ChartConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colors: Record<string, string>;
  animations: {
    duration: number;
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    stagger: number;
  };
}

interface FilterOptions {
  dateRange: { start: Date; end: Date };
  categories: string[];
  confidenceThreshold: number;
  searchTerm: string;
  sortBy: 'timestamp' | 'value' | 'confidence';
  sortOrder: 'asc' | 'desc';
}

// Custom hooks for complex state management
const useDataProcessor = (rawData: DataPoint[], filters: FilterOptions) => {
  return useMemo(() => {
    return rawData
      .filter(point => {
        const dateInRange = point.timestamp >= filters.dateRange.start.getTime() && 
                           point.timestamp <= filters.dateRange.end.getTime();
        const categoryMatch = filters.categories.length === 0 || 
                             filters.categories.includes(point.category);
        const confidenceMatch = point.metadata.confidence >= filters.confidenceThreshold;
        const searchMatch = filters.searchTerm === '' || 
                           point.metadata.source.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                           point.metadata.tags.some(tag => tag.toLowerCase().includes(filters.searchTerm.toLowerCase()));
        
        return dateInRange && categoryMatch && confidenceMatch && searchMatch;
      })
      .sort((a, b) => {
        const multiplier = filters.sortOrder === 'asc' ? 1 : -1;
        switch (filters.sortBy) {
          case 'timestamp':
            return (a.timestamp - b.timestamp) * multiplier;
          case 'value':
            return (a.value - b.value) * multiplier;
          case 'confidence':
            return (a.metadata.confidence - b.metadata.confidence) * multiplier;
          default:
            return 0;
        }
      });
  }, [rawData, filters]);
};

const useAnimationFrame = (callback: (deltaTime: number) => void, deps: React.DependencyList) => {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  
  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, deps);
};

// Complex performance test component
const TestPerformanceComponent: React.FC = () => {
  // State management with complex types
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: { 
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    },
    categories: [],
    confidenceThreshold: 0.5,
    searchTerm: '',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    width: 800,
    height: 400,
    margin: { top: 20, right: 30, bottom: 40, left: 50 },
    colors: {
      primary: '#3b82f6',
      secondary: '#ef4444',
      tertiary: '#10b981',
      background: '#f8fafc',
      grid: '#e2e8f0'
    },
    animations: {
      duration: 300,
      easing: 'ease-in-out',
      stagger: 50
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [hoverPoint, setHoverPoint] = useState<DataPoint | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'grid'>('chart');
  const [animationProgress, setAnimationProgress] = useState(0);

  // Process data using custom hook
  const processedData = useDataProcessor(rawData, filters);

  // Generate mock data with complex structure
  const generateMockData = useCallback((count: number): DataPoint[] => {
    const categories: Array<'primary' | 'secondary' | 'tertiary'> = ['primary', 'secondary', 'tertiary'];
    const sources = ['sensor-alpha', 'sensor-beta', 'sensor-gamma', 'manual-input', 'api-endpoint'];
    const tags = ['urgent', 'routine', 'experimental', 'validated', 'pending', 'archived'];
    
    return Array.from({ length: count }, (_, index) => ({
      id: `data-point-${index}-${Date.now()}`,
      timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Last 30 days
      value: Math.random() * 1000 + Math.sin(index * 0.1) * 200,
      category: categories[Math.floor(Math.random() * categories.length)],
      metadata: {
        source: sources[Math.floor(Math.random() * sources.length)],
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        tags: tags.filter(() => Math.random() > 0.7), // Random subset of tags
        coordinates: Math.random() > 0.5 ? {
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() > 0.5 ? Math.random() * 100 : undefined
        } : undefined
      }
    }));
  }, []);

  // Complex data loading simulation
  const loadData = useCallback(async (count: number = 1000) => {
    setIsLoading(true);
    try {
      // Simulate API delay with progressive loading
      await new Promise(resolve => setTimeout(resolve, 500));
      const newData = generateMockData(count);
      
      // Simulate chunked loading for better UX
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < newData.length; i += chunkSize) {
        chunks.push(newData.slice(i, i + chunkSize));
      }
      
      setRawData([]);
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setRawData(prev => [...prev, ...chunk]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [generateMockData]);

  // Animation frame hook usage
  useAnimationFrame((deltaTime) => {
    setAnimationProgress(prev => (prev + deltaTime * 0.001) % (Math.PI * 2));
  }, []);

  // Complex event handlers
  const handlePointSelection = useCallback((pointId: string, isMultiSelect: boolean = false) => {
    setSelectedPoints(prev => {
      const newSet = isMultiSelect ? new Set(prev) : new Set();
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  }, []);

  const handleFilterChange = useCallback(<K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleBulkOperation = useCallback((operation: 'delete' | 'export' | 'tag') => {
    const selectedData = processedData.filter(point => selectedPoints.has(point.id));
    
    switch (operation) {
      case 'delete':
        setRawData(prev => prev.filter(point => !selectedPoints.has(point.id)));
        setSelectedPoints(new Set());
        break;
      case 'export':
        const dataStr = JSON.stringify(selectedData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exported-data-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        break;
      case 'tag':
        // Complex tagging logic would go here
        console.log('Tagging operation for:', selectedData.length, 'items');
        break;
    }
  }, [processedData, selectedPoints]);

  // Complex computed values
  const statistics = useMemo(() => {
    if (processedData.length === 0) return null;
    
    const values = processedData.map(p => p.value);
    const confidences = processedData.map(p => p.metadata.confidence);
    
    return {
      count: processedData.length,
      valueStats: {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
      },
      confidenceStats: {
        min: Math.min(...confidences),
        max: Math.max(...confidences),
        mean: confidences.reduce((a, b) => a + b, 0) / confidences.length
      },
      categoryDistribution: processedData.reduce((acc, point) => {
        acc[point.category] = (acc[point.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      timeRange: {
        start: new Date(Math.min(...processedData.map(p => p.timestamp))),
        end: new Date(Math.max(...processedData.map(p => p.timestamp)))
      }
    };
  }, [processedData]);

  // Initialize with mock data
  useEffect(() => {
    loadData(500);
  }, [loadData]);

  // Render complex UI structure
  return (
    <div className="test-performance-component">
      <header className="component-header">
        <h1>Advanced Data Visualization Dashboard</h1>
        <div className="header-controls">
          <button 
            onClick={() => loadData(1000)} 
            disabled={isLoading}
            className="load-data-btn"
          >
            {isLoading ? 'Loading...' : 'Reload Data'}
          </button>
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as any)}
            className="view-mode-select"
          >
            <option value="chart">Chart View</option>
            <option value="table">Table View</option>
            <option value="grid">Grid View</option>
          </select>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="filters-panel">
          <h3>Filters & Controls</h3>
          
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Search sources or tags..."
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label>Confidence Threshold:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={filters.confidenceThreshold}
              onChange={(e) => handleFilterChange('confidenceThreshold', parseFloat(e.target.value))}
              className="confidence-slider"
            />
            <span>{(filters.confidenceThreshold * 100).toFixed(0)}%</span>
          </div>

          <div className="filter-group">
            <label>Categories:</label>
            {['primary', 'secondary', 'tertiary'].map(category => (
              <label key={category} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={(e) => {
                    const newCategories = e.target.checked
                      ? [...filters.categories, category]
                      : filters.categories.filter(c => c !== category);
                    handleFilterChange('categories', newCategories);
                  }}
                />
                {category}
              </label>
            ))}
          </div>

          {selectedPoints.size > 0 && (
            <div className="bulk-operations">
              <h4>Bulk Operations ({selectedPoints.size} selected)</h4>
              <button onClick={() => handleBulkOperation('export')}>Export</button>
              <button onClick={() => handleBulkOperation('delete')}>Delete</button>
              <button onClick={() => handleBulkOperation('tag')}>Tag</button>
            </div>
          )}
        </aside>

        <main className="main-content">
          {statistics && (
            <div className="statistics-panel">
              <div className="stat-card">
                <h4>Data Points</h4>
                <span className="stat-value">{statistics.count.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <h4>Avg Value</h4>
                <span className="stat-value">{statistics.valueStats.mean.toFixed(2)}</span>
              </div>
              <div className="stat-card">
                <h4>Avg Confidence</h4>
                <span className="stat-value">{(statistics.confidenceStats.mean * 100).toFixed(1)}%</span>
              </div>
              <div className="stat-card">
                <h4>Time Range</h4>
                <span className="stat-value">
                  {Math.ceil((statistics.timeRange.end.getTime() - statistics.timeRange.start.getTime()) / (24 * 60 * 60 * 1000))} days
                </span>
              </div>
            </div>
          )}

          <div className="visualization-area">
            {viewMode === 'chart' && (
              <div className="chart-container">
                <svg width={chartConfig.width} height={chartConfig.height}>
                  {/* Complex SVG rendering would go here */}
                  <rect 
                    width={chartConfig.width} 
                    height={chartConfig.height} 
                    fill={chartConfig.colors.background}
                  />
                  {processedData.slice(0, 100).map((point, index) => (
                    <circle
                      key={point.id}
                      cx={50 + (index % 20) * 35}
                      cy={50 + Math.floor(index / 20) * 35}
                      r={3 + Math.sin(animationProgress + index * 0.1) * 2}
                      fill={chartConfig.colors[point.category]}
                      opacity={point.metadata.confidence}
                      onClick={() => handlePointSelection(point.id)}
                      onMouseEnter={() => setHoverPoint(point)}
                      onMouseLeave={() => setHoverPoint(null)}
                      className={selectedPoints.has(point.id) ? 'selected' : ''}
                    />
                  ))}
                </svg>
              </div>
            )}

            {viewMode === 'table' && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>ID</th>
                      <th>Timestamp</th>
                      <th>Value</th>
                      <th>Category</th>
                      <th>Source</th>
                      <th>Confidence</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.slice(0, 50).map(point => (
                      <tr key={point.id} className={selectedPoints.has(point.id) ? 'selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedPoints.has(point.id)}
                            onChange={() => handlePointSelection(point.id)}
                          />
                        </td>
                        <td>{point.id.slice(-8)}</td>
                        <td>{new Date(point.timestamp).toLocaleString()}</td>
                        <td>{point.value.toFixed(2)}</td>
                        <td>{point.category}</td>
                        <td>{point.metadata.source}</td>
                        <td>{(point.metadata.confidence * 100).toFixed(1)}%</td>
                        <td>{point.metadata.tags.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hoverPoint && (
              <div className="tooltip">
                <h4>Data Point Details</h4>
                <p><strong>ID:</strong> {hoverPoint.id}</p>
                <p><strong>Value:</strong> {hoverPoint.value.toFixed(2)}</p>
                <p><strong>Confidence:</strong> {(hoverPoint.metadata.confidence * 100).toFixed(1)}%</p>
                <p><strong>Source:</strong> {hoverPoint.metadata.source}</p>
                <p><strong>Tags:</strong> {hoverPoint.metadata.tags.join(', ')}</p>
                {hoverPoint.metadata.coordinates && (
                  <p><strong>Coordinates:</strong> 
                    ({hoverPoint.metadata.coordinates.x.toFixed(1)}, {hoverPoint.metadata.coordinates.y.toFixed(1)}
                    {hoverPoint.metadata.coordinates.z && `, ${hoverPoint.metadata.coordinates.z.toFixed(1)}`})
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TestPerformanceComponent;
