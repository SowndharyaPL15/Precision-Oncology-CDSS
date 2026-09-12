import { useState, useEffect } from 'react';
import { Box, Button, Typography, Grid, Card, CardContent, Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BiotechIcon from '@mui/icons-material/Biotech';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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

  const [validation, setValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    confidence: number;
    message: string;
  }>({
    isValidating: false,
    isValid: null,
    confidence: 0,
    message: ''
  });

  useEffect(() => {
    let isMounted = true;
    const fallbackList = [
      { patient_id: 'P-1001-DEMO', full_name: 'John Doe (Demo Patient)' },
      { patient_id: 'P-1002-DEMO', full_name: 'Jane Smith (Demo Patient)' }
    ];

    const fetchPatientsWithRetry = async (attempts = 3, delayMs = 2000) => {
      for (let i = 0; i < attempts; i++) {
        try {
          const response = await apiClient.get('/patients');
          if (Array.isArray(response.data) && response.data.length > 0) {
            if (isMounted) {
              setPatients(response.data);
              setPatientId(response.data[0].patient_id);
              setFetchingPatients(false);
            }
            return;
          }
        } catch (error) {
          if (i < attempts - 1) {
            await new Promise((res) => setTimeout(res, delayMs));
          }
        }
      }
      if (isMounted) {
        setPatients(fallbackList);
        setPatientId(fallbackList[0].patient_id);
        setFetchingPatients(false);
      }
    };

    fetchPatientsWithRetry();
    return () => {
      isMounted = false;
    };
  }, []);

  const validateUploadedFile = async (selectedFile: File) => {
    setValidation({
      isValidating: true,
      isValid: null,
      confidence: 0,
      message: 'Validating microscopic H&E stain profile...'
    });
    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      const resp = await apiClient.post('/validate-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = resp.data;
      setValidation({
        isValidating: false,
        isValid: data.is_valid,
        confidence: data.confidence,
        message: data.message
      });
      if (!data.is_valid) {
        toast.error(`Invalid Image: ${data.message}`);
      } else {
        toast.success(`Histopathology slide verified (${(data.confidence * 100).toFixed(0)}% match)`);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Image validation failed.';
      setValidation({
        isValidating: false,
        isValid: false,
        confidence: 0,
        message: detail
      });
      toast.error(`Validation error: ${detail}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      validateUploadedFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.warning('Please select a medical image first');
      return;
    }
    if (validation.isValidating) {
      toast.warning('Please wait until histopathology slide verification completes.');
      return;
    }
    if (validation.isValid === false) {
      toast.error(`Prediction blocked: ${validation.message || 'Only histopathology slides are permitted.'}`);
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
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to generate prediction';
      toast.error(`Analysis Error: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4 }}>New AI Prediction</Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>1. Upload Histopathology Image</Typography>
          <Box 
            sx={{ 
              border: '2px dashed',
              borderColor: validation.isValid === false ? 'error.main' : validation.isValid === true ? 'success.main' : '#ccc',
              borderRadius: 2, 
              p: 4, 
              textAlign: 'center',
              bgcolor: validation.isValid === false ? 'error.light' : validation.isValid === true ? 'success.light' : 'background.default',
              bgcolorOpacity: 0.05,
              cursor: 'pointer'
            }}
            component="label"
          >
            <input type="file" hidden accept="image/*" onChange={handleFileChange} />
            {!preview ? (
              <>
                <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1">Click to upload or drag and drop</Typography>
                <Typography variant="body2" color="text.secondary">Only H&E stained histopathology slides permitted (PNG, JPG, TIFF)</Typography>
              </>
            ) : (
              <Box>
                <img src={preview} alt="Preview" style={{ maxHeight: 260, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }} />
                
                {validation.isValidating && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="primary">Validating H&E microscopic stain profile...</Typography>
                  </Box>
                )}

                {validation.isValid === true && (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>✓ Verified Histopathology Slide</Typography>
                    <Typography variant="caption">H&E Staining and Cellular Structure Confirmed ({(validation.confidence * 100).toFixed(1)}% match)</Typography>
                  </Alert>
                )}

                {validation.isValid === false && (
                  <Alert severity="error" icon={<WarningIcon />} sx={{ mt: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>⚠️ Non-Histopathology Image Detected — Prediction Blocked</Typography>
                    <Typography variant="body2">{validation.message}</Typography>
                    <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                      Please select an authentic microscopic H&E stained biopsy slide.
                    </Typography>
                  </Alert>
                )}
              </Box>
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
          color={validation.isValid === false ? "error" : "primary"}
          size="large" 
          onClick={handleSubmit} 
          disabled={loading || !file || !patientId || validation.isValid === false || validation.isValidating}
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : validation.isValid === false ? (
              <WarningIcon />
            ) : (
              <BiotechIcon />
            )
          }
        >
          {loading 
            ? 'Processing Analysis...' 
            : validation.isValid === false 
              ? 'Prediction Blocked (Invalid Image)' 
              : 'Generate Prediction & Report'}
        </Button>
      </Box>
    </Box>
  );
}
