import { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid, Card, CardContent, Select, MenuItem, InputLabel, FormControl, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

interface Patient {
  patient_id: string;
  full_name: string;
}

export default function NewPrediction() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [patientId, setPatientId] = useState('');
  const [dataset, setDataset] = useState('lung');
  const [modelName, setModelName] = useState('resnet50');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiClient.get('/patients');
        setPatients(response.data);
        if (response.data.length > 0) {
          setPatientId(response.data[0].patient_id);
        }
      } catch (error) {
        toast.error('Failed to load patients for selection');
      } finally {
        setFetchingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.warning('Please select a medical image first');
      return;
    }
    if (!patientId) {
      toast.warning('Please select a patient');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset', dataset);
    formData.append('model_name', modelName);
    formData.append('patient_id', patientId);

    try {
      const response = await apiClient.post('/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Prediction generated successfully!');
      // Navigate to the result page with the report ID or prediction ID
      navigate(`/result/${response.data.prediction_id}`, { state: { report: response.data, preview } });
    } catch (error) {
      toast.error('Failed to generate prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4 }}>New AI Prediction</Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>1. Upload Medical Image</Typography>
          <Box 
            sx={{ 
              border: '2px dashed #ccc', 
              borderRadius: 2, 
              p: 4, 
              textAlign: 'center',
              bgcolor: 'background.default',
              cursor: 'pointer'
            }}
            component="label"
          >
            <input type="file" hidden accept="image/*" onChange={handleFileChange} />
            {!preview ? (
              <>
                <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1">Click to upload or drag and drop</Typography>
                <Typography variant="body2" color="text.secondary">Supports PNG, JPG, JPEG, TIFF</Typography>
              </>
            ) : (
              <img src={preview} alt="Preview" style={{ maxHeight: 300, maxWidth: '100%', objectFit: 'contain' }} />
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>2. Prediction Configuration</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Patient</InputLabel>
                <Select
                  value={patientId}
                  label="Patient"
                  onChange={(e: any) => setPatientId(e.target.value)}
                  disabled={fetchingPatients}
                >
                  {patients.map(p => (
                    <MenuItem key={p.patient_id} value={p.patient_id}>{p.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Dataset / Cancer Type</InputLabel>
                <Select
                  value={dataset}
                  label="Dataset / Cancer Type"
                  onChange={(e: any) => setDataset(e.target.value)}
                >
                  <MenuItem value="lung">Lung Cancer (LC25000)</MenuItem>
                  <MenuItem value="breast">Breast Cancer (BreaKHis)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>AI Model Architecture</InputLabel>
                <Select
                  value={modelName}
                  label="AI Model Architecture"
                  onChange={(e: any) => setModelName(e.target.value)}
                >
                   <MenuItem value="resnet50">ResNet50 (Recommended / Default Model)</MenuItem>
                   <MenuItem value="densenet121">DenseNet121</MenuItem>
                   <MenuItem value="efficientnetb0">EfficientNetB0</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          size="large" 
          onClick={handleSubmit} 
          disabled={loading || !file || !patientId}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BiotechIcon />}
        >
          {loading ? 'Processing Analysis...' : 'Generate Prediction & Report'}
        </Button>
      </Box>
    </Box>
  );
}

// Temporary workaround for the missing import in the original snippet, assuming it's available in the component context or we can use another icon.
import BiotechIcon from '@mui/icons-material/Biotech';
