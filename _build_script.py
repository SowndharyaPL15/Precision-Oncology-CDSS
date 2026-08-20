import pathlib, textwrap

src_lines = []
src_lines.append('import React, { useState, useEffect, useRef } from "react";')
src_lines.append('import { Link, useNavigate } from "react-router-dom";')
src_lines.append('import { Form, Alert, Modal, Button, Badge } from "react-bootstrap";')
src_lines.append('''import {
  FaStethoscope, FaUser, FaEnvelope, FaLock, FaUserMd, FaUserPlus,
  FaCheckCircle, FaUserShield, FaCamera, FaFingerprint, FaShieldAlt, FaArrowRight,
  FaEye, FaEyeSlash, FaUserCog, FaTimes, FaInfoCircle
} from "react-icons/fa";''')
src_lines.append('import { toast } from "react-toastify";')
src_lines.append('import apiClient from "../../api/client";')
src_lines.append('import { extractFaceEmbedding, captureMultiPoseSamples, checkFrameQuality } from "../../utils/faceAuth";')
src_lines.append('import { registerPasskey } from "../../utils/webauthn";')
src_lines.append('import "../Login/login.css";')
src_lines.append('')
src_lines.append('const RBAC_TABLE = [')
src_lines.append('  { feature: "Clinical Dashboard",      doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Patient Management",       doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Lung Histopathology AI",   doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Breast Cancer AI",         doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Grad-CAM Heatmaps",        doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Clinical Reports",         doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Model Comparison",         doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "Analytics",                doctor: true,  pathologist: true,  admin: false },')
src_lines.append('  { feature: "User Management",          doctor: false, pathologist: false, admin: true  },')
src_lines.append('  { feature: "Role Grant / Revoke",      doctor: false, pathologist: false, admin: true  },')
src_lines.append('  { feature: "Audit Logs",               doctor: false, pathologist: false, admin: true  },')
src_lines.append('  { feature: "Security Overview",        doctor: false, pathologist: false, admin: true  },')
src_lines.append('  { feature: "System & AI Info",         doctor: false, pathologist: false, admin: true  },')
src_lines.append('  { feature: "Account Enable / Disable", doctor: false, pathologist: false, admin: true  },')
src_lines.append('];')

pathlib.Path("d:/Precision-Oncology/_write_register.py").write_text("\n".join(src_lines), encoding="utf-8")
print("part1 ok")
