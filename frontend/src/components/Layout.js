import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import { 
  DashboardOutlined, 
  FileTextOutlined, 
  TeamOutlined, 
  UserOutlined,
  BarChartOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout = ({ children }) => {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.real_name,
      disabled: true,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const getMenuItems = () => {
    const items = [
      {
        key: '/',
        icon: <DashboardOutlined />,
        label: '首页',
        onClick: () => navigate('/'),
      },
      {
        key: '/report/write',
        icon: <FileTextOutlined />,
        label: '填写周报',
        onClick: () => navigate('/report/write'),
      },
      {
        key: '/report/history',
        icon: <FileTextOutlined />,
        label: '我的周报',
        onClick: () => navigate('/report/history'),
      },
    ];

    if (isManager()) {
      items.push(
        {
          key: '/manage/reports',
          icon: <FileTextOutlined />,
          label: '周报管理',
          onClick: () => navigate('/manage/reports'),
        },
        {
          key: '/manage/reminder',
          icon: <BellOutlined />,
          label: '催报管理',
          onClick: () => navigate('/manage/reminder'),
        },
        {
          key: '/stats',
          icon: <BarChartOutlined />,
          label: '统计分析',
          onClick: () => navigate('/stats'),
        }
      );
    }

    if (isAdmin()) {
      items.push(
        {
          key: '/manage/teams',
          icon: <TeamOutlined />,
          label: '团队管理',
          onClick: () => navigate('/manage/teams'),
        },
        {
          key: '/manage/users',
          icon: <UserOutlined />,
          label: '用户管理',
          onClick: () => navigate('/manage/users'),
        }
      );
    }

    return items;
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      '/': '首页',
      '/report/write': '填写周报',
      '/report/history': '我的周报',
      '/manage/reports': '周报管理',
      '/manage/reminder': '催报管理',
      '/stats': '统计分析',
      '/manage/teams': '团队管理',
      '/manage/users': '用户管理',
    };
    return titles[path] || '周记';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={220}>
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>周记</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ borderRight: 0 }}
          items={getMenuItems()}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <Title level={5} style={{ margin: 0 }}>{getPageTitle()}</Title>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.real_name}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', background: '#fff', borderRadius: 8, padding: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
