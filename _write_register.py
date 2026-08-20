import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Modal, Button, Badge } from "react-bootstrap";
import {
  FaStethoscope, FaUser, FaEnvelope, FaLock, FaUserMd, FaUserPlus,
  FaCheckCircle, FaUserShield, FaCamera, FaFingerprint, FaShieldAlt, FaArrowRight,
  FaEye, FaEyeSlash, FaUserCog, FaTimes, FaInfoCircle
} from "react-icons/fa";
import { toast } from "react-toastify";
import apiClient from "../../api/client";
import { extractFaceEmbedding, captureMultiPoseSamples, checkFrameQuality } from "../../utils/faceAuth";
import { registerPasskey } from "../../utils/webauthn";
import "../Login/login.css";

const RBAC_TABLE = [
  { feature: "Clinical Dashboard",      doctor: true,  pathologist: true,  admin: false },
  { feature: "Patient Management",       doctor: true,  pathologist: true,  admin: false },
  { feature: "Lung Histopathology AI",   doctor: true,  pathologist: true,  admin: false },
  { feature: "Breast Cancer AI",         doctor: true,  pathologist: true,  admin: false },
  { feature: "Grad-CAM Heatmaps",        doctor: true,  pathologist: true,  admin: false },
  { feature: "Clinical Reports",         doctor: true,  pathologist: true,  admin: false },
  { feature: "Model Comparison",         doctor: true,  pathologist: true,  admin: false },
  { feature: "Analytics",                doctor: true,  pathologist: true,  admin: false },
  { feature: "User Management",          doctor: false, pathologist: false, admin: true  },
  { feature: "Role Grant / Revoke",      doctor: false, pathologist: false, admin: true  },
  { feature: "Audit Logs",               doctor: false, pathologist: false, admin: true  },
  { feature: "Security Overview",        doctor: false, pathologist: false, admin: true  },
  { feature: "System & AI Info",         doctor: false, pathologist: false, admin: true  },
  { feature: "Account Enable / Disable", doctor: false, pathologist: false, admin: true  },
];