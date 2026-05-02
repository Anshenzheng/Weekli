import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, Modal, message, Typography, Select, Input, DatePicker, Empty } from 'antd';
import { EyeOutlined, RollbackOutlined, SearchOutlined } from '@ant-design/icons';
import { reportAPI, teamAPI, userAPI } from '../services/api';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getCurrentWeek = () => {
  const today = new Date();
  const year = today.getFullYear();
  const week = Math.ceil((today - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return `${year}W${week.toString().padStart(2, '0')}`;
};

const ManageReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    week: getCurrentWeek(),
    team_id: null,
    user_id: null,
    status: null,
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('获取团队列表失败', error);
    }
  };

  const fetchUsers = async (teamId) => {
    try {
      const params = teamId ? { team_id: teamId } : {};
      const response = await userAPI.getAll(params);
      setUsers(response.data);
    } catch (error) {
      console.error('获取用户列表失败', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.week) params.week = filters.week;
      if (filters.team_id) params.team_id = filters.team_id;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.status) params.status = filters.status;
      
      const response = await reportAPI.getAll(params);
      setReports(response.data);
    } catch (error) {
      message.error('获取周报列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchReports();
  }, []);

  useEffect(() => {
    fetchUsers(filters.team_id);
  }, [filters.team_id]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'team_id' && { user_id: null }),
    }));
  };

  const handleSearch = () => {
    fetchReports();
  };

  const showDetail = (report) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  const showReturnModal = (report) => {
    setSelectedReport(report);
    setReturnReason('');
    setReturnModalVisible(true);
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      message.warning('请填写退回原因');
      return;
    }
    
    setReturnLoading(true);
    try {
      await reportAPI.returnReport(selectedReport.id, returnReason);
      message.success('周报已退回');
      setReturnModalVisible(false);
      fetchReports();
    } catch (error) {
      message.error(error.response?.data?.msg || '退回失败');
    } finally {
      setReturnLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      draft: { color: 'default', text: '草稿' },
      submitted: { color: 'success', text: '已提交' },
      returned: { color: 'warning', text: '已退回' },
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const columns = [
    {
      title: '周次',
      dataIndex: 'week',
      key: 'week',
      width: 100,
      fixed: 'left',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '成员',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user) => user?.real_name || '-',
    },
    {
      title: '团队',
      dataIndex: 'user',
      key: 'team',
      width: 120,
      render: (user) => user?.team_name || <Text type="secondary">-</Text>,
    },
    {
      title: '内容摘要',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">暂无内容</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 160,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            查看
          </Button>
          {record.status === 'submitted' && (
            <Button
              type="link"
              icon={<RollbackOutlined />}
              onClick={() => showReturnModal(record)}
              danger
            >
              退回
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>周报管理</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select
            placeholder="选择周次"
            value={filters.week}
            onChange={(value) => handleFilterChange('week', value)}
            style={{ width: 150 }}
            allowClear
          >
            {Array.from({ length: 10 }, (_, i) => {
              const today = new Date();
              const year = today.getFullYear();
              const currentWeek = Math.ceil((today - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
              let week = currentWeek - i;
              let displayYear = year;
              if (week < 1) {
                week = 52 + week;
                displayYear = year - 1;
              }
              const weekStr = `${displayYear}W${week.toString().padStart(2, '0')}`;
              return <Option key={weekStr} value={weekStr}>{weekStr}</Option>;
            })}
          </Select>
          
          <Select
            placeholder="选择团队"
            value={filters.team_id || undefined}
            onChange={(value) => handleFilterChange('team_id', value)}
            style={{ width: 150 }}
            allowClear
          >
            {teams.map(team => (
              <Option key={team.id} value={team.id}>
                {team.name}
              </Option>
            ))}
          </Select>
          
          <Select
            placeholder="选择成员"
            value={filters.user_id || undefined}
            onChange={(value) => handleFilterChange('user_id', value)}
            style={{ width: 150 }}
            allowClear
            disabled={!filters.team_id && users.length === 0}
          >
            {users.map(user => (
              <Option key={user.id} value={user.id}>
                {user.real_name}
              </Option>
            ))}
          </Select>
          
          <Select
            placeholder="选择状态"
            value={filters.status || undefined}
            onChange={(value) => handleFilterChange('status', value)}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="draft">草稿</Option>
            <Option value="submitted">已提交</Option>
            <Option value="returned">已退回</Option>
          </Select>
          
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: (
              <Empty description="暂无周报数据" />
            ),
          }}
        />
      </Card>

      <Modal
        title={`周报详情 - ${selectedReport?.week}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedReport?.status === 'submitted' && (
            <Button 
              key="return" 
              type="primary" 
              danger
              onClick={() => {
                setDetailModalVisible(false);
                showReturnModal(selectedReport);
              }}
            >
              退回
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong>状态：</Text>
                {getStatusTag(selectedReport.status)}
              </Space>
              <Space>
                {selectedReport.user?.real_name && (
                  <Text type="secondary">
                    成员：{selectedReport.user.real_name}
                  </Text>
                )}
                {selectedReport.submitted_at && (
                  <Text type="secondary">
                    提交时间：{new Date(selectedReport.submitted_at).toLocaleString('zh-CN')}
                  </Text>
                )}
              </Space>
            </div>
            
            {selectedReport.return_reason && (
              <div style={{ 
                background: '#fff7e6', 
                padding: 16, 
                borderRadius: 4, 
                marginBottom: 16,
                border: '1px solid #ffe58f'
              }}>
                <Text type="warning" style={{ fontWeight: 'bold' }}>退回原因：</Text>
                <br />
                <Text type="warning">{selectedReport.return_reason}</Text>
              </div>
            )}
            
            <div style={{ background: '#f5f5f5', padding: 24, borderRadius: 4 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>周报内容：</Text>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#333' }}>
                {selectedReport.content || <Text type="secondary">暂无内容</Text>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="退回周报"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setReturnModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            danger
            onClick={handleReturn}
            loading={returnLoading}
          >
            确认退回
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>成员：</Text>{selectedReport?.user?.real_name}
          <br />
          <Text strong>周次：</Text>{selectedReport?.week}
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          退回原因（必填）：
        </Text>
        <TextArea
          rows={4}
          placeholder="请填写退回原因，成员将看到此原因"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default ManageReports;
