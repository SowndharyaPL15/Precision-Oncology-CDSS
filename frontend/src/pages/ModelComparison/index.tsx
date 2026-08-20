import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import { RadialLinearScale, Chart as ChartJS, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function ModelComparison() {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const response = await apiClient.get('/comparison');
        setComparison(response.data);
      } catch (error) {
        toast.error('Failed to load model comparison data');
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!comparison || !comparison.datasets) {
    return <Typography variant="h6">No comparison data available.</Typography>;
  }

  // Helper to extract data for Radar chart for a specific dataset
  const getRadarData = (datasetName: string) => {
    const ds = comparison.datasets[datasetName];
    if (!ds || !ds.models) return null;

    const models = Object.keys(ds.models);
    const colors = [
      'rgba(25, 118, 210, 0.2)', // primary
      'rgba(156, 39, 176, 0.2)', // secondary
      'rgba(46, 125, 50, 0.2)'   // success
    ];
    const borderColors = ['#1976d2', '#9c27b0', '#2e7d32'];

    return {
      labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC', 'MCC'],
      datasets: models.map((model, i) => {
        const metrics = ds.models[model];
        return {
          label: model,
          data: [
            metrics.accuracy * 100,
            metrics.precision * 100,
            metrics.recall * 100,
            metrics.f1_score * 100,
            metrics.roc_auc * 100,
            metrics.mcc * 100 // Scale MCC for visualization if needed, assuming normalized
          ],
          backgroundColor: colors[i % colors.length],
          borderColor: borderColors[i % borderColors.length],
          borderWidth: 2,
        };
      })
    };
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4 }}>AI Model Performance Comparison</Typography>

      {Object.keys(comparison.datasets).map(datasetName => {
        const ds = comparison.datasets[datasetName];
        const radarData = getRadarData(datasetName);

        return (
          <Box key={datasetName} sx={{ mb: 6 }}>
            <Typography variant="h5" sx={{ textTransform: 'capitalize', mb: 2 }}>{datasetName} Cancer Dataset</Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Metric</TableCell>
                        {Object.keys(ds.models).map(model => (
                          <TableCell key={model} align="right" sx={{ fontWeight: 'bold' }}>
                            {model}
                            {ds.best_model === model && ' 🏆'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'mcc', 'inference_time_ms_per_image'].map(metric => (
                        <TableRow key={metric}>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{metric.replace(/_/g, ' ')}</TableCell>
                          {Object.keys(ds.models).map(model => (
                            <TableCell key={model} align="right">
                              {metric.includes('time') 
                                ? `${ds.models[model][metric].toFixed(2)} ms`
                                : `${(ds.models[model][metric] * 100).toFixed(2)}%`
                              }
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <CardContent sx={{ width: '100%', height: 350 }}>
                    {radarData && (
                      <Radar 
                        data={radarData} 
                        options={{ 
                          maintainAspectRatio: false,
                          scales: { r: { min: 80, max: 100 } } // Assuming high performing models
                        }} 
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}
