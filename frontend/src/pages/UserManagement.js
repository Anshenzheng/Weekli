import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Card, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  message, 
  Popconfirm,
  Typography,
  Tag,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  TeamOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { userAPI, teamAPI } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('获取团队列表失败', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const showCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      real_name: user.real_name,
      role: user.role,
      team_id: user.team_id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (userId) => {
    try {
      await userAPI.delete(userId);
      message.success('用户已删除');
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.msg || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        const updateData = {
          real_name: values.real_name,
          role: values.role,
          team_id: values.team_id,
        };
        if (values.password) {
          updateData.password = values.password;
        }
        await userAPI.update(editingUser.id, updateData);
        message.success('用户已更新');
      } else {
        await userAPI.create({
          username: values.username,
          password: values.password,
          real_name: values.real_name,
          role: values.role,
          team_id: values.team_id,
        });
        message.success('用户已创建');
      }
      
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.msg || '操作失败');
      }
    }
  };

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员' },
      manager: { color: 'orange', text: '经理' },
      member: { color: 'blue', text: '成员' },
    };
    const info = roleMap[role] || { color: 'default', text: role };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (text) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '真实姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role) => getRoleTag(role),
    },
    {
      title: '所属团队',
      dataIndex: 'team_name',
      key: 'team_name',
      width: 150,
      render: (name) => name ? (
        <Tag color="blue">
          <TeamOutlined style={{ marginRight: 4 }} />
          {name}
        </Tag>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            编辑
          </Button>
          {record.role !== 'admin' && (
            <Popconfirm
              title="确定要删除这个用户吗？"
              description="删除后无法恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                icon={<DeleteOutlined />}
                danger
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        用户管理
      </Title>
      
      <Card>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateModal}
          >
            新建用户
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: (
              <Empty description="暂无用户数据">
                <Button type="primary" onClick={showCreateModal}>
                  创建第一个用户
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            确定
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 80, message: '用户名不能超过80个字符' },
            ]}
          >
            <Input 
              placeholder="请输入用户名" 
              disabled={!!editingUser}
            />
          </Form.Item>

          <Form.Item
            name="real_name"
            label="真实姓名"
            rules={[
              { required: true, message: '请输入真实姓名' },
              { max: 80, message: '真实姓名不能超过80个字符' },
            ]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              ...(editingUser ? [] : [{ required: true, message: '请输入密码' }]),
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Password 
              placeholder={editingUser ? "留空表示不修改密码" : "请输入密码"}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[
              { required: true, message: '请选择角色' },
            ]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">
                <Space>
                  <SafetyOutlined />
                  管理员
                </Space>
              </Option>
              <Option value="manager">
                <Space>
                  <TeamOutlined />
                  经理
                </Space>
              </Option>
              <Option value="member">
                <Space>
                  <UserOutlined />
                  成员
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="team_id"
            label="所属团队"
          >
            <Select placeholder="请选择团队（可选）" allowClear>
              {teams.map(team => (
                <Option key={team.id} value={team.id}>
                  <TeamOutlined style={{ marginRight: 4 }} />
                  {team.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
