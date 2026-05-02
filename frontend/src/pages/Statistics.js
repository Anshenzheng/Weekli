import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Select, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Tag,
  Empty,
  Spin,
  Button,
  Space,
  message
} from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChartOutlined, 
  TeamOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { statsAPI, teamAPI } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const COLORS = ['#52c41a', '#faad14', '#1890ff', '#722ed1', '#eb2f96', '#fa8c16'];

const Statistics = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('获取团队列表失败', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedTeam) {
        params.team_id = selectedTeam;
      }
      const response = await statsAPI.getSubmissionStats(params);
      setStats(response.data);
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchStats();
  }, []);

  const handleTeamChange = (value) => {
    setSelectedTeam(value);
  };

  const handleSearch = () => {
    fetchStats();
  };

  const getWeekChartData = () => {
    if (!stats?.week_stats) return [];
    return stats.week_stats.map(item => ({
      name: item.week,
      已提交: item.submitted,
      已退回: item.returned,
      提交率: item.submission_rate,
    })).reverse();
  };

  const getUserChartData = () => {
    if (!stats?.user_stats) return [];
    return stats.user_stats.map(item => ({
      name: item.real_name,
      已提交: item.submitted_count,
      已退回: item.returned_count,
      草稿: item.draft_count,
    }));
  };

  const getStatusPieData = () => {
    if (!stats?.user_stats) return [];
    const totalSubmitted = stats.user_stats.reduce((sum, item) => sum + item.submitted_count, 0);
    const totalReturned = stats.user_stats.reduce((sum, item) => sum + item.returned_count, 0);
    const totalDraft = stats.user_stats.reduce((sum, item) => sum + item.draft_count, 0);
    
    return [
      { name: '已提交', value: totalSubmitted, color: '#52c41a' },
      { name: '已退回', value: totalReturned, color: '#faad14' },
      { name: '草稿', value: totalDraft, color: '#1890ff' },
    ].filter(item => item.value > 0);
  };

  const userColumns = [
    {
      title: '成员',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '总报告数',
      dataIndex: 'total_reports',
      key: 'total_reports',
      width: 100,
      sorter: (a, b) => a.total_reports - b.total_reports,
    },
    {
      title: '已提交',
      dataIndex: 'submitted_count',
      key: 'submitted_count',
      width: 100,
      sorter: (a, b) => a.submitted_count - b.submitted_count,
      render: (count) => <Tag color="success">{count}</Tag>,
    },
    {
      title: '已退回',
      dataIndex: 'returned_count',
      key: 'returned_count',
      width: 100,
      sorter: (a, b) => a.returned_count - b.returned_count,
      render: (count) => count > 0 ? <Tag color="warning">{count}</Tag> : <Tag color="default">{count}</Tag>,
    },
    {
      title: '草稿',
      dataIndex: 'draft_count',
      key: 'draft_count',
      width: 100,
      sorter: (a, b) => a.draft_count - b.draft_count,
      render: (count) => count > 0 ? <Tag color="processing">{count}</Tag> : <Tag color="default">{count}</Tag>,
    },
    {
      title: '提交率',
      dataIndex: 'submission_rate',
      key: 'submission_rate',
      width: 100,
      sorter: (a, b) => a.submission_rate - b.submission_rate,
      render: (rate) => (
        <Tag color={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error'}>
          {rate}%
        </Tag>
      ),
    },
  ];

  const weekColumns = [
    {
      title: '周次',
      dataIndex: 'week',
      key: 'week',
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '总报告数',
      dataIndex: 'total',
      key: 'total',
      width: 100,
    },
    {
      title: '已提交',
      dataIndex: 'submitted',
      key: 'submitted',
      width: 100,
      render: (count) => <Tag color="success">{count}</Tag>,
    },
    {
      title: '已退回',
      dataIndex: 'returned',
      key: 'returned',
      width: 100,
      render: (count) => count > 0 ? <Tag color="warning">{count}</Tag> : <Tag color="default">{count}</Tag>,
    },
    {
      title: '提交率',
      dataIndex: 'submission_rate',
      key: 'submission_rate',
      width: 120,
      render: (rate) => (
        <Tag color={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error'}>
          {rate}%
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        统计分析
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="选择团队（可选）"
            value={selectedTeam || undefined}
            onChange={handleTeamChange}
            style={{ width: 200 }}
            allowClear
          >
            {teams.map(team => (
              <Option key={team.id} value={team.id}>
                {team.name}
              </Option>
            ))}
          </Select>
          <Button type="primary" icon={<ReloadOutlined />} onClick={handleSearch}>
            刷新数据
          </Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总成员数"
                value={stats?.user_stats?.length || 0}
                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总报告数"
                value={
                  stats?.user_stats?.reduce((sum, item) => sum + (item.total_reports || 0), 0) || 0
                }
                prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已提交总数"
                value={
                  stats?.user_stats?.reduce((sum, item) => sum + (item.submitted_count || 0), 0) || 0
                }
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均提交率"
                value={
                  stats?.user_stats?.length > 0 
                    ? Math.round(
                        stats.user_stats.reduce((sum, item) => sum + item.submission_rate, 0) / stats.user_stats.length
                      )
                    : 0
                }
                suffix="%"
                prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={16}>
            <Card title="各周提交趋势">
              {getWeekChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={getWeekChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="已提交" fill="#52c41a" />
                    <Bar dataKey="已退回" fill="#faad14" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无数据" />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card title="报告状态分布">
              {getStatusPieData().length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={getStatusPieData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getStatusPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无数据" />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="各成员提交统计">
              {stats?.user_stats?.length > 0 ? (
                <Table
                  columns={userColumns}
                  dataSource={stats.user_stats}
                  rowKey="user_id"
                  pagination={{ pageSize: 5 }}
                />
              ) : (
                <Empty description="暂无数据" />
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="各周提交统计">
              {stats?.week_stats?.length > 0 ? (
                <Table
                  columns={weekColumns}
                  dataSource={stats.week_stats}
                  rowKey="week"
                  pagination={{ pageSize: 5 }}
                />
              ) : (
                <Empty description="暂无数据" />
              )}
            </Card>
          </Col>
        </Row>

        {getUserChartData().length > 0 && (
          <Card title="各成员报告分布图" style={{ marginTop: 24 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getUserChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="已提交" fill="#52c41a" />
                <Bar dataKey="已退回" fill="#faad14" />
                <Bar dataKey="草稿" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </Spin>
    </div>
  );
};

export default Statistics;
