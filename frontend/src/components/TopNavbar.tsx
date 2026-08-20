import { Navbar, Container, Form, InputGroup, Nav, Dropdown } from 'react-bootstrap';
import { FaStethoscope, FaSearch, FaBell, FaUserMd, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function TopNavbar() {
  const { user, logout } = useAuth();

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm py-2 px-3 border-bottom sticky-top" style={{ zIndex: 1000 }}>
      <Container fluid className="px-0 px-md-3 d-flex align-items-center">
        {/* Mobile menu toggle would go here if needed, but sidebar is fixed usually on desktop */}
        
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center text-primary d-md-none fw-bold">
          <FaStethoscope className="me-2 fs-4" />
          <span className="fs-5">Precision Oncology</span>
        </Navbar.Brand>

        <Form className="d-none d-md-flex ms-md-4" style={{ width: '350px' }}>
          <InputGroup>
            <InputGroup.Text className="bg-light border-0 text-muted">
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search patients by ID, Name..."
              className="bg-light border-0 shadow-none"
              aria-label="Search"
            />
          </InputGroup>
        </Form>

        <Nav className="ms-auto d-flex align-items-center flex-row gap-3">
          <Dropdown align="end" className="me-3 mt-1">
            <Dropdown.Toggle variant="light" className="bg-transparent border-0 p-0 shadow-none position-relative text-muted custom-toggle">
              <FaBell className="fs-5" />
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow border-0 mt-2" style={{ width: '300px' }}>
              <Dropdown.Header className="fw-bold">Notifications</Dropdown.Header>
              <Dropdown.Item className="text-wrap py-2 text-muted text-center small">
                No new notifications
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          
          <Dropdown align="end">
            <Dropdown.Toggle variant="light" id="dropdown-custom-components" className="bg-transparent border-0 d-flex align-items-center p-0 shadow-none">
              <div className="d-flex align-items-center gap-2 text-dark">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '35px', height: '35px' }}>
                  <FaUserMd />
                </div>
                <div className="d-none d-md-block text-start" style={{ lineHeight: '1.2' }}>
                  <div className="fw-bold small">{user?.name || 'Dr. Smith'}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Oncologist</div>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow border-0 mt-2">
              <Dropdown.Item as={Link} to="/profile"><FaUserMd className="me-2 text-muted" /> Profile</Dropdown.Item>
              <Dropdown.Item as={Link} to="/settings"><FaCog className="me-2 text-muted" /> Settings</Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={logout} className="text-danger"><FaSignOutAlt className="me-2" /> Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Nav>
      </Container>
    </Navbar>
  );
}
