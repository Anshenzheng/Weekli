import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Card, 
  Modal, 
  Form, 
  Input, 
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
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import { teamAPI } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form] = Form.useForm();

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
    } catch (error) {
      message.error('获取团队列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const showCreateModal = () => {
    setEditingTeam(null);
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (team) => {
    setEditingTeam(team);
    form.setFieldsValue({
      name: team.name,
      description: team.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (teamId) => {
    try {
      await teamAPI.delete(teamId);
      message.success('团队已删除');
      fetchTeams();
    } catch (error) {
      message.error(error.response?.data?.msg || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTeam) {
        await teamAPI.update(editingTeam.id, values);
        message.success('团队已更新');
      } else {
        await teamAPI.create(values);
        message.success('团队已创建');
      }
      
      setModalVisible(false);
      fetchTeams();
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.msg || '操作失败');
      }
    }
  };

  const columns = [
    {
      title: '团队名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => (
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">暂无描述</Text>,
    },
    {
      title: '成员数量',
      dataIndex: 'member_count',
      key: 'member_count',
      width: 120,
      render: (count) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          <UserOutlined style={{ marginRight: 4 }} />
          {count} 人
        </Tag>
      ),
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
          <Popconfirm
            title="确定要删除这个团队吗？"
            description={record.member_count > 0 ? "该团队还有成员，无法删除" : "删除后无法恢复"}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.member_count > 0}
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
              disabled={record.member_count > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        团队管理
      </Title>
      
      <Card>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateModal}
          >
            新建团队
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={teams}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: (
              <Empty description="暂无团队数据">
                <Button type="primary" onClick={showCreateModal}>
                  创建第一个团队
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingTeam ? '编辑团队' : '新建团队'}
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
            name="name"
            label="团队名称"
            rules={[
              { required: true, message: '请输入团队名称' },
              { max: 100, message: '团队名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="请输入团队名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="团队描述"
            rules={[
              { max: 500, message: '团队描述不能超过500个字符' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="请输入团队描述（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
