import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Tag, message, Space, Divider, Typography, Modal } from 'antd';
import { SaveOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const getCurrentWeek = () => {
  const today = new Date();
  const year = today.getFullYear();
  const week = Math.ceil((today - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return `${year}W${week.toString().padStart(2, '0')}`;
};

const getRecentWeeks = () => {
  const weeks = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeek = Math.ceil((today - new Date(currentYear, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  
  for (let i = 0; i < 5; i++) {
    let week = currentWeek - i;
    let year = currentYear;
    if (week < 1) {
      week = 52 + week;
      year = currentYear - 1;
    }
    weeks.push(`${year}W${week.toString().padStart(2, '0')}`);
  }
  
  return weeks;
};

const WriteReport = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [canEdit, setCanEdit] = useState(true);

  const fetchReport = async (week) => {
    try {
      const response = await reportAPI.getMyWeekReport(week);
      const data = response.data;
      setReport(data);
      setCanEdit(data.can_edit);
      form.setFieldsValue({
        content: data.content || '',
      });
    } catch (error) {
      message.error('获取周报失败');
    }
  };

  useEffect(() => {
    fetchReport(selectedWeek);
  }, [selectedWeek]);

  const handleSave = async (submit = false) => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const response = await reportAPI.create({
        week: selectedWeek,
        content: values.content,
        submit: submit,
      });
      
      message.success(submit ? '周报已提交！' : '草稿已保存！');
      fetchReport(selectedWeek);
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.msg || '操作失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    confirm({
      title: '确认提交',
      content: '提交后将无法修改，只有管理员退回后才能继续编辑。确定要提交吗？',
      okText: '确认提交',
      okType: 'primary',
      cancelText: '取消',
      onOk: () => handleSave(true),
    });
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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/')}
          style={{ marginBottom: 16 }}
        >
          返回首页
        </Button>
        <Title level={3}>填写周报</Title>
      </div>

      <Card>
        <Space style={{ marginBottom: 24 }}>
          <Text strong>选择周次：</Text>
          <Select
            value={selectedWeek}
            onChange={setSelectedWeek}
            style={{ width: 150 }}
          >
            {getRecentWeeks().map(week => (
              <Option key={week} value={week}>
                {week}
              </Option>
            ))}
          </Select>
          {report && (
            <>
              <Text>状态：</Text>
              {getStatusTag(report.status)}
            </>
          )}
        </Space>

        {report?.return_reason && (
          <div style={{ 
            background: '#fff7e6', 
            padding: 16, 
            borderRadius: 4, 
            marginBottom: 24,
            border: '1px solid #ffe58f'
          }}>
            <Text type="warning" style={{ fontWeight: 'bold' }}>
              退回原因：
            </Text>
            <br />
            <Text type="warning">{report.return_reason}</Text>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="content"
            label="周报内容"
            rules={[{ required: true, message: '请填写周报内容' }]}
          >
            <TextArea
              rows={15}
              placeholder={`请填写本周工作总结：

1. 本周完成的工作
2. 遇到的问题和解决方案
3. 下周工作计划
4. 其他需要说明的事项`}
              disabled={!canEdit}
              style={{ fontSize: 14, lineHeight: 1.6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              {canEdit && (
                <>
                  <Button
                    type="default"
                    icon={<SaveOutlined />}
                    onClick={() => handleSave(false)}
                    loading={loading}
                    size="large"
                  >
                    保存草稿
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSubmit}
                    loading={loading}
                    size="large"
                  >
                    正式提交
                  </Button>
                </>
              )}
              {!canEdit && (
                <Tag color="success">周报已提交，无法编辑</Tag>
              )}
            </Space>
          </Form.Item>
        </Form>

        {report?.submitted_at && (
          <Divider />
        )}

        {report?.submitted_at && (
          <div>
            <Text type="secondary">
              提交时间：{new Date(report.submitted_at).toLocaleString('zh-CN')}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WriteReport;
